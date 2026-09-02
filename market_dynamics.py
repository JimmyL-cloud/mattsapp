from typing import List
class MarketDynamicsAnalyzer:
Actuarial and liquidity models designed to protect the user from the favorite-longshot bias and
speculative sports card bubbles.
:
@staticmethod
def amihud _illiquidity_ratio(abs
olute_returns: List[float], dollar_volumes: List[float]) → float:
Calculates the Amihud
Illiquidity Ratio (ILLIQ) [11, 12].
Measures the absolute
percentage price change per dollar of daily trading volume.
High values trigger illiquidity discounts for thin markets (e.g., 1/1s, vintage grails) .
if len (absolute_returns) !=
len (dollar_volumes) or len (absolute_returns) == 0:
Ask 68 sources...
raise ValueError ("Data
arrays must be of equal, non-zero length. ")
days = len (absolute_returns)
daily_impacts = []
for r, v in
zip (absolute_returns, dollar_volumes) :
if v < 0:
continue # Prevent
division by zero on zero-volume days
daily_impacts. append (abs (r) / v)
if not daily_impacts:
return float('inf') #
Maximum illiquidity if no volume exists
illiq = (1 / days) *
sum (daily_impacts)
return illiq
@staticmethod def weibull_hazard_function(t:
float, lambd: float, p: float) → float:
Ask 68 sources...
Calculates the Weibull
Hazard Function h(t) to measure speculative bubble risk [10].
-p > 1: Increasing hazard
(Player on an unsustainable hot streak / hype bubble) [10].
- p = 1: Constant hazard
(Exponential memoryless risk; stable
Hall of Famer) [10, 13].
-P< 1: Decreasing hazard
(Post-injury recovery / market
bottoming) [101.
if t <= 0 or lambd <= 0 or p
< 0:
return 0.0
hazard_rate = lambd * p*
((lambd * t) ** (p - 1))
return hazard_rate

68
