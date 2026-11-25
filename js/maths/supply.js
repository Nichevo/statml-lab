// "Show the maths" panels for the supply chain pages.
Object.assign(Lab.maths, {
  "reorder-point": String.raw`
<h3>Demand over the lead time</h3>
<p>Daily demand \(D_i\) has mean d and SD \(\sigma_d\), independent across days. The lead time L has mean \(\bar L\) and SD \(\sigma_L\), independent of demand. Lead-time demand is a random sum \(X = \sum_{i=1}^{L} D_i\). By the laws of total expectation and total variance:</p>
\[ E[X] = \bar L\,d, \qquad \operatorname{Var}(X) = E[\operatorname{Var}(X\mid L)] + \operatorname{Var}(E[X\mid L]) = \bar L\,\sigma_d^2 + d^2\sigma_L^2 . \]
<h3>Safety stock and reorder point</h3>
\[ SS = z\sqrt{\bar L\sigma_d^2 + d^2\sigma_L^2}, \qquad ROP = \bar L d + SS, \qquad z = \Phi^{-1}(\text{CSL}). \]
<p>This assumes X is roughly normal. With few days or skewed demand the true quantile can differ, which is why simulation is a useful check.</p>
<h3>Economic order quantity</h3>
<p>With annual demand D, cost per order K and holding cost per unit-year h, yearly cost is</p>
\[ TC(Q) = \frac{D}{Q}K + \frac{Q}{2}h, \qquad TC'(Q) = -\frac{DK}{Q^2} + \frac h2 = 0 \;\Rightarrow\; Q^* = \sqrt{\frac{2DK}{h}} . \]
<p>At \(Q^*\) ordering and holding costs are equal, and \(TC(Q^*) = \sqrt{2DKh}\). The curve is flat near the optimum: \(TC(Q)/TC(Q^*) = \frac12\left(\frac{Q}{Q^*} + \frac{Q^*}{Q}\right)\), so ordering 50% more than \(Q^*\) costs only about 8% extra.</p>
<h3>Fill rate</h3>
<p>Expected units short per cycle is \(\sigma_X\,G(z)\), with the standard normal loss function \(G(z) = \varphi(z) - z(1 - \Phi(z))\). The fill rate is then \(1 - \sigma_X G(z)/Q\), which is why the fill rate is usually well above the cycle service level when Q is large.</p>`,

  "bullwhip-effect": String.raw`
<h3>One stage with an order-up-to rule</h3>
<p>A retailer sees demand \(D_t\), forecasts it with a p-period moving average \(\hat\mu_t\) and \(\hat\sigma_t\), and orders up to \(S_t = L\hat\mu_t + z\sqrt L\,\hat\sigma_t\). The order is</p>
\[ q_t = S_t - S_{t-1} + D_{t-1} . \]
<p>Every change in the forecast moves S, and that change is passed upstream on top of replacing demand.</p>
<h3>The amplification</h3>
<p>For demand that is AR(1) or iid, and ignoring the σ term, Chen, Drezner, Ryan and Simchi-Levi derived the lower bound</p>
\[ \frac{\operatorname{Var}(q)}{\operatorname{Var}(D)} \ge 1 + \frac{2L}{p} + \frac{2L^2}{p^2} . \]
<p>Longer lead times (L) and more reactive forecasts (smaller p) both increase the bullwhip. With exponential smoothing, α plays the role of 2/(p + 1).</p>
<h3>Up a chain</h3>
<p>If each of k stages forecasts from its own incoming orders, the ratios multiply, roughly \(\prod_i \left(1 + \frac{2L_i}{p} + \frac{2L_i^2}{p^2}\right)\). If all stages instead see end-customer demand (shared point-of-sale data), the bound becomes additive in the lead times: \(1 + \frac{2\sum L_i}{p} + \frac{2(\sum L_i)^2}{p^2}\). That's why information sharing reduces bullwhip.</p>
<h3>Other causes</h3>
<p>Order batching (ordering Q every Q/d periods turns smooth demand into spikes), price promotions (forward buying), and rationing games (inflating orders when allocation is pro rata) add variance regardless of forecasting.</p>`,

  "carrying-cost": String.raw`
<h3>The yearly carrying rate</h3>
<p>Carrying cost is usually expressed as a rate r per year on the unit cost c, so a unit held for a year costs \(h = r c\). The rate adds up separate parts:</p>
\[ r = r_{\text{capital}} + r_{\text{storage}} + r_{\text{insurance+tax}} + r_{\text{obsolescence}} + r_{\text{shrink}} . \]
<p>The capital part is the return the money could earn elsewhere (often the weighted average cost of capital). For a unit held t years with continuous compounding the capital cost is \(c\,(e^{r_c t} - 1) \approx c\,r_c t\).</p>
<h3>Average inventory</h3>
<p>With order size Q and safety stock SS, stock falls in a sawtooth from Q + SS to SS, so average inventory is \(Q/2 + SS\) and</p>
\[ \text{yearly carrying cost} = r c\left(\frac Q2 + SS\right). \]
<h3>Marginal vs average</h3>
<p>Some costs are fixed in the short run (a leased warehouse), so the cost of one extra unit is lower than the average. Decisions about how much stock to add should use the marginal rate: only the parts that actually change with the stock level.</p>
<h3>Ordering vs holding</h3>
<p>Yearly order cost \(\frac DQ K\) falls as Q grows while carrying cost \(\frac Q2 rc\) rises; they balance at \(Q^* = \sqrt{2DK/(rc)}\). A higher carrying rate means smaller, more frequent orders, with \(Q^*\) falling as \(1/\sqrt r\).</p>`,

  "cash-to-cash": String.raw`
<h3>The three day counts</h3>
\[ \text{DIO} = \frac{\text{inventory}}{\text{COGS}}\times 365, \qquad \text{DSO} = \frac{\text{receivables}}{\text{revenue}}\times 365, \qquad \text{DPO} = \frac{\text{payables}}{\text{COGS}}\times 365 . \]
\[ \text{C2C} = \text{DIO} + \text{DSO} - \text{DPO} . \]
<p>Each day count is a stock divided by a flow, which by Little's law (\(L = \lambda W\)) is the average time money spends in that stage.</p>
<h3>From days to dollars</h3>
<p>Working capital tied up is about \(\text{C2C} \times\) daily COGS (more exactly, inventory + receivables − payables). Cutting C2C by \(\Delta\) days frees roughly</p>
\[ \Delta\,\text{cash} \approx \Delta \times \frac{\text{COGS}}{365}, \]
<p>a one-off release of cash, plus a yearly saving of that amount × the cost of capital.</p>
<h3>Caveats</h3>
<ul>
<li>Using year-end balances can mislead if the business is seasonal; average monthly balances are better.</li>
<li>DSO uses revenue while DIO and DPO use COGS, so the three aren't on exactly the same base.</li>
<li>Stretching DPO moves cash from suppliers to you; it can raise prices or supply risk, so the "saving" isn't free for the chain as a whole.</li>
</ul>`,

  "censored-demand": String.raw`
<h3>The problem</h3>
<p>Recorded sales are \(S_t = \min(D_t, I_t)\), where \(I_t\) is stock available. When \(S_t = I_t\) we only know \(D_t \ge I_t\): the observation is censored. The plain average of sales is biased downward:</p>
\[ E[S] = E[\min(D, I)] = \mu - E[(D - I)^+] &lt; \mu . \]
<h3>Fixing it with a likelihood</h3>
<p>If demand has density f and CDF F with parameters θ, uncensored periods contribute \(f(s_t)\) and stocked-out periods contribute \(P(D \ge I_t) = 1 - F(I_t)\):</p>
\[ \log L(\theta) = \sum_{\text{in stock}} \log f(s_t;\theta) + \sum_{\text{stocked out}} \log\big(1 - F(I_t;\theta)\big). \]
<p>Maximising this (a Tobit model when demand is normal) recovers the mean and SD of true demand. The EM algorithm does the same by repeatedly replacing each censored value with its expected value given that it exceeded \(I_t\): for a normal, \(E[D \mid D \ge I] = \mu + \sigma\frac{\varphi(a)}{1-\Phi(a)}\) with \(a = (I-\mu)/\sigma\).</p>
<h3>Simpler fixes</h3>
<ul>
<li>Drop stocked-out periods: unbiased only if stock-outs happen at random, but they happen in high-demand periods, so this still underestimates.</li>
<li>Scale up partial days: if stock ran out after a fraction ω of the day, estimate demand as \(S_t/\omega\).</li>
</ul>
<h3>Why it compounds</h3>
<p>Underestimated demand leads to smaller orders, which causes more stock-outs and more censoring, so the forecast keeps falling unless the censoring is corrected.</p>`,

  "cost-margin": String.raw`
<h3>Landed cost</h3>
<p>For one unit bought at FOB price c:</p>
\[ c_{\text{landed}} = c + \text{freight} + \text{insurance} + \text{duty} + \text{handling} + \text{carrying}, \qquad \text{duty} = t \times \text{customs value}. \]
<h3>Down the P&amp;L</h3>
\[ \text{gross margin} = \frac{p - c_{\text{landed}}}{p}, \qquad \text{operating profit} = (p - c_{\text{landed}})\,Q - \text{fixed costs}. \]
<p>Markup and margin are different: a markup m on cost gives margin \(m/(1+m)\); a 50% markup is a 33% margin.</p>
<h3>Why small cost savings matter so much</h3>
<p>Operating profit is a small difference of large numbers. If profit is π on revenue R, a cost saving of s% of revenue raises profit by</p>
\[ \frac{\Delta\pi}{\pi} = \frac{s\,R}{\pi} . \]
<p>With a 5% profit margin, cutting costs by 1% of revenue raises profit by 20%. To earn the same extra profit by selling more at a 5% margin, revenue would have to grow 20%.</p>
<h3>Valuing an improvement</h3>
<p>Yearly value = change in landed cost × volume + change in carrying cost (r × change in average inventory × unit cost) + margin on extra sales from better service. A one-off cash release from lower inventory is counted separately, not as profit.</p>`,

  "cost-to-serve": String.raw`
<h3>Activity-based costing</h3>
<p>Each activity a (order handling, picking, delivery stops, returns, special packing) has a cost driver rate \(r_a = \text{cost of activity}/\text{driver volume}\). A customer's cost to serve is</p>
\[ \text{CTS}_j = \sum_a r_a\, v_{a,j}, \qquad \pi_j = \text{gross margin}_j - \text{CTS}_j, \]
<p>where \(v_{a,j}\) is customer j's use of driver a (orders, lines, drops, returns).</p>
<h3>The whale curve</h3>
<p>Sort customers by \(\pi_j\) from most to least profitable and plot cumulative profit \(\sum_{k\le j}\pi_k\) against the share of customers. The curve rises above 100% of total profit, often to 150 to 300%, then falls as loss-making customers are added. The peak height H means</p>
\[ \text{profit from profitable customers} = H \times \text{total profit}, \qquad \text{losses} = (H - 1)\times\text{total profit}. \]
<h3>Order size effects</h3>
<p>Per-order costs are spread over the order: cost per unit = \(\frac{K_{\text{order}}}{q} + \frac{K_{\text{line}}\,n_{\text{lines}}}{q} + c_{\text{pick}}\). Halving the average order size q nearly doubles the fixed part per unit, which is why minimum order sizes and delivery charges exist.</p>`,

  "demand-sensing": String.raw`
<h3>Blending two signals</h3>
<p>The base forecast \(F\) comes from the statistical model; a short-term signal \(x\) (recent orders, point-of-sale, weather) gives a second estimate \(G\). If their errors have variances \(\sigma_F^2\), \(\sigma_G^2\) and correlation ρ, the best linear blend is \(wF + (1-w)G\) with</p>
\[ w^* = \frac{\sigma_G^2 - \rho\sigma_F\sigma_G}{\sigma_F^2 + \sigma_G^2 - 2\rho\sigma_F\sigma_G}, \]
<p>the same formula as for combining forecasts. For independent errors, the weight on each source is proportional to its precision \(1/\sigma^2\).</p>
<h3>Why it only helps short horizons</h3>
<p>The short-term signal's information decays with horizon. If its predictive correlation with demand h periods ahead falls like \(\rho_h = \rho_1\phi^{h-1}\), the error of the sensed estimate grows towards the base error, and \(w^*\) on the sensing input shrinks towards 0. Gains are largest at 1 to 2 weeks and vanish by the lead time of most production decisions.</p>
<h3>Measuring it fairly</h3>
<p>Score the sensed forecast and the base forecast at the same lag. A sensed forecast made 2 days before the period will always look better than a 4-week-ahead plan; the question is whether it is better at the lag where a decision can still change.</p>`,

  "forecast-value": String.raw`
<h3>From error to safety stock</h3>
<p>Safety stock is proportional to forecast error over the lead time: \(SS = z\,\sigma_L\). If a better forecast cuts the error by a fraction δ, safety stock falls by the same fraction at the same service level:</p>
\[ \Delta SS = z\,\delta\,\sigma_L, \qquad \text{yearly saving} = r\,c\,\Delta SS . \]
<h3>From safety stock to shortfalls</h3>
<p>Alternatively keep the stock and take the gain as service. Expected units short per cycle is \(\sigma_L\,G(z)\), with the normal loss function \(G(z) = \varphi(z) - z(1-\Phi(z))\). Keeping SS fixed while the error falls to \((1-\delta)\sigma_L\) raises z to \(z' = SS/((1-\delta)\sigma_L)\), so the yearly saving in lost margin m is</p>
\[ \frac{D}{Q}\Big[\sigma_L G(z) - (1-\delta)\,\sigma_L\,G(z')\Big]\times m . \]
<h3>Rule of thumb</h3>
<p>Because both safety stock and shortfalls scale with σ, each percentage point of error reduction is worth about the same in money. The total is roughly \(z\,r\,c\,\sigma_L \times\) (error reduction %) for the stock route, which is easy to compute per item and add up.</p>`,

  "freight": String.raw`
<h3>Two pricing shapes</h3>
<p>Full truckload (FTL) is a fixed price per truck, F, whatever is in it. Less-than-truckload (LTL) is a rate per unit weight that falls in breaks as the shipment grows, plus minimum charges. Cost per unit:</p>
\[ c_{\text{FTL}}(q) = \frac{F}{q}, \qquad c_{\text{LTL}}(q) = \text{rate}(q). \]
<p>FTL becomes cheaper above the break-even \(q^* = F/\text{rate}\). Carriers also charge LTL shipments "as if" at the next weight break when that is cheaper (deficit weight pricing).</p>
<h3>Frequency vs stock</h3>
<p>Shipping every T days with demand d per day sends \(q = dT\) per shipment and keeps average cycle stock \(dT/2\). Yearly cost is</p>
\[ C(T) = \frac{365}{T}\,F + \frac{dT}{2}\,h, \]
<p>an EOQ with the truck as the order cost: \(T^* = \sqrt{2F/(dh)}\) days, capped by what fits in one truck. Consolidating several products into one truck raises d and shortens \(T^*\), which is why multi-product consolidation saves both freight and stock.</p>
<h3>Mode choice</h3>
<p>Faster modes cost more per unit but shorten the lead time L. Pipeline stock is \(d\,L\) and safety stock is about \(z\sigma_d\sqrt L\), so the stock saving of a faster mode is \(h\,(d\,\Delta L + z\sigma_d(\sqrt{L} - \sqrt{L'}))\) per year. That is worth more for expensive, high-volume items.</p>`,

  "frozen-zones": String.raw`
<h3>Time fences</h3>
<p>Weeks inside the frozen zone (horizon \(F\)) cannot be changed; the slushy zone allows limited changes; beyond it the plan is free. A plan for week t made at time s is \(P_{s,t}\). Plan nervousness can be measured as the average size of revisions:</p>
\[ N = \frac{1}{n}\sum_{s}\sum_{t > s} |P_{s,t} - P_{s-1,t}| . \]
<p>Freezing sets \(P_{s,t} = P_{s-1,t}\) for \(t \le s + F\), cutting N to the revisions beyond the fence.</p>
<h3>What freezing costs</h3>
<p>Inside the fence, production can't react to the newest forecast, so the effective forecast horizon for the buffer becomes F + L instead of L. If forecast error grows like \(\sigma_h \approx \sigma_1\sqrt h\), the safety stock needed rises by a factor</p>
\[ \sqrt{\frac{F + L}{L}} . \]
<p>With L = 1 and F = 3 that doubles the safety stock. The trade-off is that a stable plan avoids changeover, expediting and overtime costs.</p>
<h3>Forecasting inside the fence</h3>
<p>Accuracy should be measured on the forecast that was used for each decision, i.e. at lag F + L, not the latest one. Measuring the most recent forecast makes the process look more accurate than the plan it actually drove.</p>`,

  "level-vs-chase": String.raw`
<h3>Two pure strategies</h3>
<p>Demand \(d_t\) over T periods, production \(p_t\), inventory \(I_t = I_{t-1} + p_t - d_t \ge 0\).</p>
<ul>
<li><b>Chase</b>: \(p_t = d_t\). No inventory, but capacity changes every period, costing \(c_h(p_t - p_{t-1})^+ + c_f(p_{t-1} - p_t)^+\) (hiring, firing, overtime).</li>
<li><b>Level</b>: \(p_t = \bar p\), the smallest constant rate that never runs out: \(\bar p = \max_t \frac{\sum_{s\le t} d_s - I_0}{t}\). No capacity changes, but inventory builds ahead of the peak, costing \(h\sum_t I_t\).</li>
</ul>
<h3>The mixed plan as a linear program</h3>
\[ \min \sum_t \big(c\,p_t + h I_t + c_o O_t + c_h H_t + c_f F_t\big) \]
<p>subject to \(I_t = I_{t-1} + p_t + O_t - d_t\), \(W_t = W_{t-1} + H_t - F_t\), \(p_t \le k W_t\), \(O_t \le o W_t\), all variables ≥ 0. Here W is the workforce, O overtime, H and F hires and layoffs. The LP finds the cheapest mix, which is typically some level production plus overtime at the peak.</p>
<h3>Rule of thumb</h3>
<p>Building one unit ahead by k periods costs about \(k h\); flexing capacity for it costs about \(c_h + c_f\) (or the overtime premium). Build ahead when \(k h\) is less than the cost of flexing.</p>`,

  "lead-time-error": String.raw`
<h3>Errors at the right lag</h3>
<p>A decision made at time t with lead time L depends on the forecast for periods \(t+1..t+L\). The relevant error is</p>
\[ E_t^{(L)} = \sum_{h=1}^{L}\big(y_{t+h} - \hat y_{t+h|t}\big), \qquad \sigma_L = \sqrt{\tfrac1N\textstyle\sum_t \big(E_t^{(L)}\big)^2}. \]
<p>Each \(\hat y_{t+h|t}\) is made at the same origin t (the forecast "frozen" at the order date), not the latest forecast for that period.</p>
<h3>Why √L is a shortcut</h3>
<p>The variance of a sum is</p>
\[ \operatorname{Var}\Big(\sum_{h=1}^{L} e_h\Big) = \sum_h \sigma_h^2 + 2\sum_{h&lt;k}\operatorname{Cov}(e_h, e_k). \]
<p>If the errors had equal variance σ² and were uncorrelated, this is \(L\sigma^2\), giving \(\sigma_L = \sigma\sqrt L\). But h-step errors from the same origin are usually positively correlated (a wrong level makes every week wrong in the same direction), and \(\sigma_h\) grows with h. Both make the true \(\sigma_L\) larger than \(\sigma_1\sqrt L\). With constant correlation ρ the factor is \(\sqrt{L + L(L-1)\rho}\), which approaches L for ρ near 1.</p>
<h3>Safety stock</h3>
\[ SS = z\,\sigma_L \quad\text{(measured)} \qquad\text{vs}\qquad SS = z\,\sigma_1\sqrt L \quad\text{(shortcut)}. \]`,

  "monthly-to-weekly": String.raw`
<h3>Three splits</h3>
<p>A monthly forecast M is split into weeks (or days) with weights \(w_k\) summing to 1: \(\hat y_k = w_k M\).</p>
<ul>
<li><b>Straight line</b>: \(w_k = n_k/n\), the share of days in the week.</li>
<li><b>Day-of-week profile</b>: \(w_k = \sum_{d\in k} \pi_{\text{dow}(d)} \big/ \sum_{d\in\text{month}}\pi_{\text{dow}(d)}\), where \(\pi\) are average day-of-week shares from history. Months with five Fridays get more weight on those weeks.</li>
<li><b>Week-of-month profile</b>: weights from historical shares of each week within the month (paydays, month-end pushes).</li>
</ul>
<h3>Why monthly accuracy hides it</h3>
<p>Monthly error is the sum of weekly errors: \(e_M = \sum_k e_k\). Errors from a bad split cancel, since \(\sum_k (w_k - w_k^{\text{true}})M = 0\). So the split can be badly wrong and the monthly MAPE unchanged. Measured weekly, the split error adds directly:</p>
\[ e_k = \underbrace{(w_k^{\text{true}} - w_k)\,M^{\text{true}}}_{\text{split error}} + \underbrace{w_k\,(M^{\text{true}} - M)}_{\text{monthly error}} . \]
<h3>Choosing weights</h3>
<p>Estimate the profile from several years and smooth it (shrink towards the straight line) when history is short: \(w = \lambda\,w_{\text{profile}} + (1-\lambda)\,w_{\text{flat}}\), with λ chosen by backtest.</p>`,

  "moq": String.raw`
<h3>Total yearly cost with price breaks</h3>
<p>With annual demand D, order cost K, carrying rate r, and unit price \(c(Q)\) that drops at break quantities:</p>
\[ TC(Q) = c(Q)\,D + \frac{D}{Q}K + \frac Q2\, r\, c(Q) . \]
<h3>The all-units method</h3>
<ol>
<li>For each price \(c_j\), compute \(Q_j^* = \sqrt{2DK/(r c_j)}\).</li>
<li>If \(Q_j^*\) is below that price's minimum quantity \(b_j\), round it up to \(b_j\) (the cost curve is convex, so the nearest feasible point is best for that price).</li>
<li>Compute \(TC\) for each candidate and pick the lowest.</li>
</ol>
<h3>When an MOQ is worth accepting</h3>
<p>Forcing \(Q = b\) above \(Q^*\) adds holding and ordering cost of</p>
\[ \Delta = \frac{b}{2}rc + \frac{D}{b}K - \sqrt{2DKrc}, \]
<p>which must be less than the price saving \(D\,(c_{\text{old}} - c_{\text{new}})\). For slow movers, b can be many months of demand, and obsolescence risk (part of r) usually dominates.</p>`,

  "network-design": String.raw`
<h3>Centre of gravity</h3>
<p>For one facility serving customers at \((x_j, y_j)\) with volumes \(w_j\) and transport rate per unit distance, the cost is \(\sum_j w_j\,\text{dist}((x,y), (x_j,y_j))\). With squared distances the minimum is the weighted mean:</p>
\[ \bar x = \frac{\sum w_j x_j}{\sum w_j}, \qquad \bar y = \frac{\sum w_j y_j}{\sum w_j}. \]
<p>With straight-line distances (the Weber problem) there is no closed form; Weiszfeld's iteration converges to it:</p>
\[ x^{(k+1)} = \frac{\sum_j w_j x_j / d_j}{\sum_j w_j / d_j}, \qquad d_j = \text{dist}\big(x^{(k)}, (x_j,y_j)\big). \]
<h3>Choosing k sites</h3>
<p>Total cost of k warehouses:</p>
\[ C(k) = k\,F + \text{transport}(k) + \text{inventory}(k). \]
<p>Transport falls roughly as \(1/\sqrt k\) (each site covers a smaller area). Safety stock grows with \(\sqrt k\) by the square-root law, since demand is split across k stock points. Fixed cost grows linearly. The optimum is where the marginal fixed and inventory cost of one more site equals the transport it saves.</p>
<h3>Assignment</h3>
<p>Given sites, each customer goes to the cheapest one; given assignments, each site moves to its group's centre. Alternating these (like k-means) finds a good local solution; mixed-integer programming finds the global one.</p>`,

  "newsvendor": String.raw`
<h3>Expected cost</h3>
<p>Order Q before random demand D with CDF F. Each unsold unit costs \(c_o = c - v\) (cost minus salvage) and each unmet unit costs \(c_u = p - c\) (lost margin):</p>
\[ G(Q) = c_o\,E[(Q - D)^+] + c_u\,E[(D - Q)^+]. \]
<h3>The critical ratio</h3>
<p>Raising Q by one unit adds \(c_o\) if demand falls below Q (probability F(Q)) and saves \(c_u\) otherwise:</p>
\[ G'(Q) = c_o F(Q) - c_u\big(1 - F(Q)\big) = 0 \;\Rightarrow\; F(Q^*) = \frac{c_u}{c_u + c_o}. \]
<p>G is convex, so this is the minimum. For normal demand \(Q^* = \mu + z\sigma\) with \(z = \Phi^{-1}\!\big(\frac{c_u}{c_u+c_o}\big)\).</p>
<h3>Expected profit</h3>
<p>With expected leftovers \(E[(Q-D)^+]\) and expected shortfall \(E[(D-Q)^+] = \sigma\,G_N(z)\) for normal demand, where \(G_N(z) = \varphi(z) - z(1 - \Phi(z))\):</p>
\[ E[\pi(Q^*)] = (p - c)\mu - \sigma\big[(p - v)\,\varphi(z)\big] \quad\text{(normal demand)}. \]
<p>So expected profit falls linearly in σ: each unit of demand uncertainty costs \((p - v)\varphi(z)\). That is the money value of a better forecast for a one-shot decision.</p>`,

  "plant-shutdown": String.raw`
<h3>Stock needed at the start of the shutdown</h3>
<p>For a shutdown of S weeks, stock at the start must cover demand through the shutdown plus safety stock:</p>
\[ I_{\text{start}} = \sum_{t \in \text{shutdown}} \hat d_t + z\,\sigma\sqrt{S + L}. \]
<p>The safety term uses S + L because no production can respond until after the restart.</p>
<h3>Late build (backward scheduling)</h3>
<p>With capacity \(k_t\) above demand by a surplus \(s_t = k_t - d_t\), build the extra stock in the weeks just before the shutdown, working backwards. The latest start week \(t_0\) is the smallest number of weeks back whose surplus covers the requirement:</p>
\[ \sum_{t = t_0}^{t_{\text{shut}}-1} s_t \ge I_{\text{start}} - I_{\text{normal}} . \]
<p>Building late minimises holding cost, which is roughly \(h \sum_t I_t\): every unit built a week earlier adds h.</p>
<h3>Alternatives</h3>
<p>Level build (spread the extra evenly over N weeks) costs more holding, about \(h\,\frac{N+1}{2}\times\) the build quantity in unit-weeks, but needs less surge capacity per week. Splitting the shutdown into two halves roughly halves the peak stock. Co-packing costs a premium per unit but avoids the stock altogether. The cheapest choice compares these costs per unit of cover.</p>`,

  "risk-pooling": String.raw`
<h3>Square-root law</h3>
<p>n locations each see demand with SD σ over the lead time, independent across locations. Separate safety stocks total \(n z\sigma\). One pooled location sees the sum, with SD \(\sigma\sqrt n\):</p>
\[ \frac{SS_{\text{pooled}}}{SS_{\text{separate}}} = \frac{z\sigma\sqrt n}{n z\sigma} = \frac{1}{\sqrt n}. \]
<p>Four sites pooled into one need half the safety stock.</p>
<h3>With correlation</h3>
<p>If demands have pairwise correlation ρ, the pooled SD is \(\sigma\sqrt{n + n(n-1)\rho}\), so</p>
\[ \frac{SS_{\text{pooled}}}{SS_{\text{separate}}} = \sqrt{\frac{1 + (n-1)\rho}{n}} . \]
<p>At ρ = 1 there is no saving; negative correlation (one region's gain is another's loss) gives even more. Unequal sizes: pooled SD is \(\sqrt{\sum\sigma_i^2}\) (for independent demand), which is always at most \(\sum\sigma_i\).</p>
<h3>Other forms of pooling</h3>
<p>Postponement (holding generic stock and customising late), transshipment between sites, and component commonality all pool demand the same way: the stock covers a sum of uncertain demands instead of each one separately.</p>`,

  "roi": String.raw`
<h3>The four numbers</h3>
<p>For an investment I and yearly net benefits \(B_t\), t = 1..T, with discount rate r:</p>
\[ \text{NPV} = -I + \sum_{t=1}^{T}\frac{B_t}{(1+r)^t}, \qquad \text{ROI} = \frac{\sum_t B_t - I}{I}. \]
<p>The internal rate of return (IRR) is the r that makes NPV = 0. Payback is the first year when cumulative (undiscounted) benefits reach I.</p>
<h3>Constant benefits</h3>
<p>For equal B each year the discounted sum is an annuity:</p>
\[ \text{NPV} = -I + B\cdot\frac{1 - (1+r)^{-T}}{r}. \]
<h3>Why NPV is the one to trust</h3>
<ul>
<li>ROI and payback ignore when the money arrives; a benefit in year 5 counts the same as one in year 1.</li>
<li>IRR can have several solutions when cash flows change sign more than once, and it ranks projects of different sizes oddly.</li>
<li>NPV adds up: the NPV of two projects is the sum of their NPVs.</li>
</ul>
<h3>Uncertainty</h3>
<p>Treat benefits as ranges and simulate: the result is a distribution of NPV. Report P(NPV &lt; 0) along with the expected NPV. A one-off inventory reduction is cash in year 0, not a yearly benefit; only the carrying cost saved recurs.</p>`,

  "service-level-cost": String.raw`
<h3>Two service measures</h3>
<p>Cycle service level (CSL) is the probability of no stock-out in a replenishment cycle: \(\text{CSL} = \Phi(z)\) when \(SS = z\sigma_L\). Fill rate is the share of demand met from stock:</p>
\[ \beta = 1 - \frac{\sigma_L\,G(z)}{Q}, \qquad G(z) = \varphi(z) - z\big(1 - \Phi(z)\big). \]
<h3>Why each point costs more</h3>
<p>Safety stock is \(z\sigma_L\) with \(z = \Phi^{-1}(\text{CSL})\). Its slope is</p>
\[ \frac{d\,SS}{d\,\text{CSL}} = \frac{\sigma_L}{\varphi(z)} , \]
<p>and \(\varphi(z)\) shrinks quickly in the tail. Going from 90% to 95% adds \(0.36\sigma_L\); 95% to 99% adds \(0.68\sigma_L\); 99% to 99.9% adds \(0.77\sigma_L\).</p>
<h3>The cost-optimal service level</h3>
<p>With a cost p per unit short and D/Q cycles a year, yearly cost is \(h\,z\sigma_L + \frac{D}{Q}\,p\,\sigma_L G(z)\). Since \(G'(z) = -(1 - \Phi(z))\), setting the derivative to zero gives</p>
\[ 1 - \Phi(z^*) = \frac{hQ}{pD}. \]
<p>So the optimal stock-out probability per cycle is the holding cost of a cycle's worth of stock relative to the shortage cost of a year's demand.</p>`,

  "supply-network": String.raw`
<h3>The guaranteed-service model</h3>
<p>Each stage j has processing time \(T_j\), quotes a service time \(S_j\) to its customers and receives a service time \(SI_j\) from its suppliers. Its net replenishment time is</p>
\[ \tau_j = SI_j + T_j - S_j \ge 0, \]
<p>and its safety stock covers demand variability over that time:</p>
\[ SS_j = z\,\sigma_j\sqrt{\tau_j}. \]
<h3>Optimising placement</h3>
<p>Choose the service times to minimise total holding cost:</p>
\[ \min_{S} \sum_j h_j\, z\sigma_j\sqrt{SI_j + T_j - S_j} \quad\text{s.t. } S_{\text{customer-facing}} \le \text{promised time},\; SI_j \ge S_i \text{ for suppliers } i. \]
<p>Because \(\sqrt\tau\) is concave, the optimum is at extremes: each stage either holds stock and quotes \(S_j = 0\), or holds none and passes the whole time downstream (\(S_j = SI_j + T_j\)). That's why a few decoupling points usually beat a little stock everywhere.</p>
<h3>Strategies compared</h3>
<p>Stock everywhere: every \(\tau_j = T_j\). Stock only at the end: the last stage's τ is the whole chain's lead time, \(\sum T_j\), and \(\sqrt{\sum T_j} &lt; \sum\sqrt{T_j}\), so one buffer can need fewer units, but at the most expensive (finished-goods) holding cost.</p>`,

  "tariffs": String.raw`
<h3>Duty</h3>
<p>Ad valorem duty at rate t on customs value V: \(\text{duty} = tV\). The customs value is the FOB price for FOB-basis countries (e.g. US) or CIF (cost + insurance + freight) for others (e.g. EU), so the same rate costs more on a CIF basis:</p>
\[ \text{duty}_{\text{CIF}} - \text{duty}_{\text{FOB}} = t\,(\text{freight} + \text{insurance}). \]
<p>A specific duty is a fixed amount per unit or kg; its percentage effect falls as the price rises.</p>
<h3>Sourcing break-even</h3>
<p>Supplier A (tariffed, cheaper) vs supplier B (no tariff): switch when</p>
\[ c_A(1 + t) + f_A > c_B + f_B \;\Leftrightarrow\; t > \frac{c_B + f_B - f_A}{c_A} - 1, \]
<p>where f is freight and other landed costs per unit.</p>
<h3>Who pays: pass-through</h3>
<p>With linear supply and demand, a per-unit tax raises the buyer's price by the share</p>
\[ \text{pass-through} = \frac{\varepsilon_S}{\varepsilon_S + |\varepsilon_D|}, \]
<p>where ε are price elasticities. Inelastic demand (|ε_D| small) means buyers bear most of it; elastic demand pushes the cost back to the seller.</p>
<h3>Stockpiling ahead of a rise</h3>
<p>Buying x extra units before a rate rise saves \(\Delta t\,c\) per unit but holds each unit for about its sell-through time. Unit i of the extra stock is held about i/d periods, so the saving is worth it until \(\Delta t\,c = h\,x/d\), i.e. \(x^* = d\,\Delta t\,c/h\) units.</p>`,

  "tsp": String.raw`
<h3>The problem</h3>
<p>Find a cyclic order of n cities minimising \(\sum_i d(\pi_i, \pi_{i+1})\). There are \((n-1)!/2\) distinct tours, so brute force is hopeless beyond about 12 cities; the problem is NP-hard.</p>
<h3>Construction heuristics</h3>
<ul>
<li><b>Nearest neighbour</b>: always go to the closest unvisited city. O(n²). In the worst case it can be about \(\tfrac12\log_2 n\) times optimal; on random points it is typically about 25% above.</li>
<li><b>Cheapest insertion</b>: insert the city k between neighbours i, j that minimises \(d(i,k) + d(k,j) - d(i,j)\). For distances obeying the triangle inequality it is guaranteed within 2× optimal.</li>
</ul>
<h3>2-opt</h3>
<p>Remove two edges (a, b) and (c, d) and reconnect as (a, c) and (b, d), reversing the segment between. The move improves the tour when</p>
\[ d(a,c) + d(b,d) &lt; d(a,b) + d(c,d). \]
<p>Repeat until no move improves. Any tour with crossing edges can be improved this way (for Euclidean distances, uncrossing two edges always shortens them by the triangle inequality), so a 2-opt tour never crosses itself. It typically ends about 5% above optimal.</p>
<h3>Bounds</h3>
<p>A minimum spanning tree is a lower bound (delete one edge of the optimal tour and you get a spanning tree). For n random points in a unit square the optimal tour length is about \(0.7124\sqrt{nA}\) (Beardwood–Halton–Hammersley), a quick check on any heuristic.</p>`,

  "abc-xyz": String.raw`
<h3>ABC: by value</h3>
<p>Sort items by annual value \(v_i = c_i D_i\), descending, and compute the cumulative share \(\sum_{k\le i} v_k / \sum v\). Typical cut-offs: A up to 80%, B up to 95%, C the rest. Value is usually highly concentrated (Pareto): if values follow a power law with exponent α, the top 20% of items carry about \(0.2^{1 - 1/\alpha}\) of the value.</p>
<h3>XYZ: by predictability</h3>
<p>Classify by the coefficient of variation of demand (or better, of forecast error):</p>
\[ CV_i = \frac{s_i}{\bar d_i}, \qquad \text{X: } CV &lt; 0.5, \quad \text{Y: } 0.5 \le CV &lt; 1, \quad \text{Z: } CV \ge 1 . \]
<p>Using forecast error instead of raw demand avoids classing a strongly seasonal but predictable item as Z.</p>
<h3>Why it guides stock policy</h3>
<p>Safety stock is \(z\,\sigma\sqrt L = z\,CV\,\bar d\sqrt L\), so as a share of average demand it scales with CV. Z items need far more stock per unit of sales; for those, make-to-order or a lower target can save a lot. For A items, the money at stake justifies more frequent review and better forecasting.</p>
<h3>Cautions</h3>
<p>CV is unstable for intermittent items (many zeros) and depends on the time bucket: weekly CV is roughly \(\sqrt{4.3}\) times monthly CV for independent weeks.</p>`,

  "inventory-simulation": String.raw`
<h3>The simulation loop</h3>
<p>Each day t: receive arrivals; serve \(\min(I_t, D_t)\); record lost or backordered units; if the inventory position \(IP_t = I_t + \text{on order} - \text{backorders} \le s\), order Q with a random lead time \(L \sim\) the chosen distribution.</p>
<h3>Measures</h3>
\[ \text{fill rate} = \frac{\sum_t \min(I_t, D_t)}{\sum_t D_t}, \qquad \text{CSL} = \frac{\#\{\text{cycles with no stock-out}\}}{\#\{\text{cycles}\}}, \qquad \bar I = \frac1T\sum_t I_t . \]
<h3>Simulation accuracy</h3>
<p>A yearly fill rate \(\hat\beta_k\) from each of n simulated years gives the estimate \(\bar\beta\) with standard error \(s_\beta/\sqrt n\). Years are independent, so this is a valid confidence interval: \(\bar\beta \pm 1.96\,s_\beta/\sqrt n\). Days within a year are not independent, so treating each day as a separate observation would understate the error.</p>
<h3>Why simulate at all</h3>
<p>The formula \(SS = z\sqrt{L\sigma_d^2 + d^2\sigma_L^2}\) assumes lead-time demand is normal. With skewed or lumpy demand, or a skewed lead time, the true quantile differs. Simulation measures what the policy actually achieves under any distribution, and lets you search s directly for the smallest value that meets the target.</p>`,

  "inventory-policies": String.raw`
<h3>The four classic rules</h3>
<ul>
<li><b>(s, Q)</b>: continuous review; when IP ≤ s, order Q.</li>
<li><b>(s, S)</b>: continuous review; when IP ≤ s, order up to S (order size S − IP).</li>
<li><b>(R, S)</b>: every R periods, order up to S.</li>
<li><b>(R, s, S)</b>: every R periods, if IP ≤ s, order up to S.</li>
</ul>
<h3>Setting the parameters</h3>
<p>Continuous review protects over the lead time L: \(s = dL + z\sigma\sqrt L\), with \(Q \approx \sqrt{2DK/h}\) and \(S \approx s + Q\).</p>
<p>Periodic review must protect over the review period plus the lead time, because an order placed now is the last chance until R periods later, and it arrives L after that:</p>
\[ S = d(R + L) + z\,\sigma\sqrt{R + L}. \]
<p>That extra \(\sqrt{R+L}\) vs \(\sqrt L\) is the safety stock cost of periodic review, traded against fewer reviews and the ability to combine orders.</p>
<h3>Why (s, S) is optimal</h3>
<p>Scarf (1960) proved that with a fixed order cost K, linear holding and shortage costs, and independent demand, an (s, S) rule minimises expected cost. The proof shows the cost-to-go function is "K-convex": \(K + G(S) \ge G(x) + \ldots\), so ordering is worthwhile only below a threshold, and then always up to the same level. With K = 0 the gap S − s shrinks to zero, giving a base-stock rule.</p>`,

  "mrp-bom": String.raw`
<h3>Gross to net</h3>
<p>For each item, in each period t:</p>
\[ \text{net}_t = \max\big(0,\; \text{gross}_t - \text{projected on hand}_{t-1} - \text{scheduled receipts}_t + SS\big). \]
<p>Projected on hand then evolves as \(\text{POH}_t = \text{POH}_{t-1} + SR_t + \text{planned receipts}_t - \text{gross}_t\).</p>
<h3>Lot sizing and offsetting</h3>
<p>Planned order receipts cover net requirements by the lot rule (lot-for-lot, fixed quantity, minimum or multiple). Planned order releases are the receipts moved earlier by the lead time: \(\text{release}_{t} = \text{receipt}_{t + L}\).</p>
<h3>Explosion</h3>
<p>A child's gross requirement is its parents' planned order releases times the quantity per:</p>
\[ \text{gross}_{c,t} = \sum_{p \in \text{parents}(c)} q_{pc}\,\text{release}_{p,t}. \]
<p>In matrix form, total requirements \(\mathbf x\) satisfy \(\mathbf x = \mathbf d + B\mathbf x\), so \(\mathbf x = (I - B)^{-1}\mathbf d\) (ignoring timing and stock), where B is the bill-of-materials matrix.</p>
<h3>Low-level codes</h3>
<p>An item's low-level code is the deepest level it appears in any BOM. Processing items in order of low-level code guarantees every parent's releases are known before the child is netted, so each item is netted exactly once. A release that would fall before today is a past-due exception: the plan is infeasible without expediting.</p>`,

  "lot-sizing": String.raw`
<h3>The problem</h3>
<p>Requirements \(d_1..d_T\), setup cost K, holding h per unit per period. Ordering in period i to cover periods i..j costs</p>
\[ c(i, j) = K + h\sum_{t=i}^{j}(t - i)\,d_t . \]
<h3>Wagner–Whitin dynamic programming</h3>
<p>In an optimal plan you only order when stock reaches zero, and each order covers whole periods (the zero-inventory property). So with \(F(0) = 0\),</p>
\[ F(j) = \min_{1\le i\le j}\big[F(i-1) + c(i, j)\big], \]
<p>and \(F(T)\) is the optimal cost. That is \(O(T^2)\) work; Wagelmans et al. reduced it to \(O(T\log T)\).</p>
<h3>Heuristics</h3>
<ul>
<li><b>Silver–Meal</b>: extend the order to cover j periods while the cost per period \(c(i, j)/(j - i + 1)\) keeps falling.</li>
<li><b>Least unit cost</b>: extend while cost per unit \(c(i,j)/\sum_{t=i}^{j} d_t\) keeps falling.</li>
<li><b>Part-period balancing</b>: extend until holding cost \(h\sum (t-i)d_t\) is closest to K.</li>
<li><b>POQ</b>: order every \(\text{round}(Q^*/\bar d)\) periods, with \(Q^* = \sqrt{2\bar dK/h}\).</li>
</ul>`,

  "shortage-allocation": String.raw`
<h3>The rules</h3>
<p>Supply A is less than total orders \(\sum q_j\). Each rule sets allocations \(a_j \le q_j\) with \(\sum a_j = A\):</p>
<ul>
<li><b>Pro rata</b>: \(a_j = A\,q_j / \sum_k q_k\). Every customer gets the same fill rate \(A/\sum q\).</li>
<li><b>By forecast or history</b>: \(a_j = A\,f_j / \sum_k f_k\), capped at \(q_j\), with the leftover reallocated.</li>
<li><b>Priority tiers</b>: fill tier 1 completely, then tier 2, and so on.</li>
<li><b>Fair share with a minimum</b>: give everyone \(\min(q_j, m_j)\) first, then split the rest.</li>
</ul>
<h3>Why pro rata invites inflation</h3>
<p>If customer j inflates its order to \(k q_j\) while others don't, it receives \(A\,k q_j / (k q_j + Q_{-j})\), which rises with k. Each customer gains by inflating; if all do, nobody gains, and the supplier sees phantom demand. Allocating on history or forecast removes the incentive, since the share no longer depends on the current order.</p>
<h3>Measuring fairness</h3>
<p>With fill rates \(f_j = a_j/q_j\), Jain's index is</p>
\[ J = \frac{\left(\sum_j f_j\right)^2}{n\sum_j f_j^2} \in \left[\tfrac1n, 1\right], \]
<p>equal to 1 when everyone gets the same fill rate and 1/n when one customer gets everything. By Cauchy–Schwarz, \(J \le 1\).</p>`,

  "queues-littles-law": String.raw`
<h3>Little's law</h3>
<p>For any stable system, the long-run average number inside, the arrival rate and the average time spent are linked:</p>
\[ L = \lambda W . \]
<p>Proof sketch: plot the number in the system over a long time T. The area under it can be counted two ways: \(\int_0^T N(t)\,dt\) (so the average is L) or as the sum of every customer's time in the system (λT customers × W). Dividing by T gives the law. It holds whatever the arrival and service distributions.</p>
<h3>One server</h3>
<p>Utilisation \(\rho = \lambda/\mu\). For M/M/1, \(W_q = \frac{\rho}{\mu - \lambda}\). For general arrivals and service, Kingman's approximation is</p>
\[ W_q \approx \frac{\rho}{1 - \rho}\cdot\frac{c_a^2 + c_s^2}{2}\cdot\frac{1}{\mu}, \]
<p>where \(c_a, c_s\) are coefficients of variation. The \(\rho/(1-\rho)\) factor is why waits explode near 100%: going from 90% to 95% busy doubles the wait.</p>
<h3>c servers: Erlang C</h3>
<p>With offered load \(a = \lambda/\mu\) and \(\rho = a/c\):</p>
\[ P(\text{wait}) = \frac{\frac{a^c}{c!}\frac{1}{1-\rho}}{\sum_{k=0}^{c-1}\frac{a^k}{k!} + \frac{a^c}{c!}\frac{1}{1-\rho}}, \qquad W_q = \frac{P(\text{wait})}{c\mu - \lambda}. \]
<p>Allen–Cunneen scales this by \((c_a^2 + c_s^2)/2\) for non-exponential times. Pooling c separate queues into one with c servers keeps ρ the same but sharply cuts P(wait).</p>`,
});
