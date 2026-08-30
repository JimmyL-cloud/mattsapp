# Existing TypeScript Valuation Implementation Audit

**Audit Status:** COMPLETE
**Repository Branch:** `audit/valuation-implementation`
**Base Branch:** `repair/mattsapp-test`
**Task ID:** AUD-001 / Issue #6
**Auditor:** Jules (Agent)
**Date:** 2026-08-30
**Policy Compliance:** `docs/operations/AGENT-SOP.md`, `docs/operations/FORMULA-CHANGE-SOP.md`

---

## Executive Summary

This document presents a comprehensive, read-only mathematical and architecture audit of the sports card valuation, forecasting, scoring, and performance implementation in `JimmyL-cloud/mattsapp`.

**Core Finding:** The codebase contains a working implementation of a weighted exponential-decay comp estimator, rule-based feature matching, multi-factor evidence confidence scoring, marketplace fee schedules, transaction scenario modeling, auction close projections, and seasonality-driven timing forecasts. However, several mathematical inconsistencies, unverified heuristic constants, duplicated valuation pathways, broken repository test suites, and undocumented assumptions exist across the implementation.

---

## 1. Valuation-Related Files and Functions

The valuation engine and its supporting forecasting, accounting, and performance boundaries span 12 TypeScript source files:

| File Path | Function / Constant Name | Description |
|---|---|---|
| `src/lib/valuation/valuation.ts` | `calculateFairValue(input)` | Core comp weighting ($w_i = e^{-\text{age}/180} \cdot m_i^2 \cdot q_i \cdot v_i$) and weighted percentile estimator ($P_{25}, P_{50}, P_{75}$). |
| `src/lib/valuation/valuation.ts` | `calculateDealScore(currentAllIn, fairCenter)` | Legacy discount-based deal score: $\text{clamp}(\lfloor \frac{\text{fair}-\text{current}}{\text{fair} \cdot 0.04} + 0.5 \rceil, -10, 10)$. |
| `src/lib/valuation/valuation.ts` | `calculateResaleDealScore(roiBps, targetRoiBps)` | Net resale deal score relative to target ROI: $\text{clamp}(\lfloor \frac{\text{roiBps} - \text{targetRoiBps}}{400} + 0.5 \rceil, -10, 10)$. |
| `src/lib/valuation/valuation.ts` | `calculateCollectorValue(askingPrice, fairCenter)` | Direct cost-excluding card comparison: $\frac{\text{fairCenter} - \text{askingPrice}}{\text{fairCenter}} \cdot 100\%$. |
| `src/lib/valuation/match-comp.ts` | `matchComp(target, candidate, options)` | 14-feature weighted similarity score and comp eligibility classifier. |
| `src/lib/valuation/match-comp.ts` | `comparableScore(left, right)` | Feature field similarity evaluator ($1.0$, $0.5$, or $0.0$). |
| `src/lib/valuation/exclusions.ts` | `detectListingExclusions(listing)` | Title regex pattern matcher and status exclusion filter. |
| `src/lib/valuation/confidence.ts` | `calculateConfidence(evidence)` | 6-component weighted confidence percentage with 4 hard evidence caps. |
| `src/lib/valuation/scenario.ts` | `calculateScenario(input)` | Transaction cost model, break-even price, minimum target sale price, and maximum purchase price. |
| `src/lib/valuation/auction.ts` | `projectAuctionClose(input)` | Quantile multiplier projection ($P_{25}, P_{50}, P_{75}$) and increment snapping for active auctions. |
| `src/lib/valuation/fees.ts` | `calculateMarketplaceFees(grossSale, schedule)` | Effective-dated marketplace fee rules sum ($\text{gross} \cdot \text{bps} / 10000 + \text{flatMinor}$). |
| `src/lib/forecasting/confidence-adjustment.ts` | `confidenceAdjustedValue(current, rawFuture, confidence)` | Linear convex combination: $V_{\text{adj}} = V_{\text{curr}} + c \cdot (V_{\text{raw}} - V_{\text{curr}})$. |
| `src/lib/forecasting/buy-timing.ts` | `calculateBuyTiming(input)` | Evaluates lowest confidence-adjusted future entry vs current cost and required edge. |
| `src/lib/forecasting/sell-timing.ts` | `calculateSellTiming(input)` | Evaluates highest confidence-adjusted future net proceeds vs current net; converts advantage to score. |
| `src/lib/forecasting/seasonality.ts` | `buildMonthlySeasonality(history, cutoff)` | Monthly seasonal relative factors $F_m = \text{median}(\text{net}_{y,m} / \text{median}(\text{net}_y))$. |
| `src/lib/forecasting/project-net.ts` | `forecastNetValues(input)` | Applies seasonal ratio $F_{\text{target}} / F_{\text{curr}}$ across 7/30/90/180/365-day horizons. |
| `src/features/analysis/run-analysis.ts` | `runAnalysis(input)` | Top-level valuation pipeline orchestration, sample size calculation, MAD calculation, tape building. |
| `src/features/analysis/manual-analysis-service.ts` | `ManualAnalysisService.create(...)` | User input validation, default settings, identity/provenance handling. |
| `src/features/performance/metrics.ts` | `calculatePerformance(evaluations, filters)` | Historical performance metrics (MAPE, Median AE, Brier Score, Drawdown, Model Value Added). |
| `src/features/performance/calibration.ts` | `calculateCalibration(evaluations)` | Grouping confidence into 5 probability calibration bins. |
| `src/lib/money/money.ts` | `multiplyMoney(value, factor)` | Fixed-point `Decimal.js` minor currency multiplication with `ROUND_HALF_UP`. |

---

## 2. Complete Execution Path from Input to Final Value

When `runAnalysis` (`src/features/analysis/run-analysis.ts:63`) is invoked, data flows sequentially through 11 distinct processing stages:

```
[Target Card Identity & Offer Input]
                │
                ▼
  Stage 1: Offer All-In Calculation
    currentAllIn = priceOrBid + shipping + (priceOrBid * buyerPremiumBps / 10,000)
                │
                ▼
  Stage 2: Comp Qualification & Feature Matching (matchComp)
    For each candidate: match score m_i (14 components), exclusion detection
    automatic inclusion: eligibility == 'ELIGIBLE' && occurredAt <= cutoff
    manual override: manualIncluded with overrideReason
                │
                ▼
  Stage 3: Fair Value Range Estimation (calculateFairValue)
    For each included comp i:
      recencyWeight = exp(-ageDays / 180)
      matchWeight = m_i ^ 2
      weight w_i = recencyWeight * matchWeight * sourceQuality * verification
    Sort comps by allInMinor ASC (break ties by ID)
    Cumulative weighted percentiles: lowMinor = P_25, centerMinor = P_50, highMinor = P_75
                │
                ▼
  Stage 4: Collector Value Comparison (calculateCollectorValue)
    diffPercent = ((centerMinor - askingPriceMinor) / centerMinor) * 100
                │
                ▼
  Stage 5: Sample Size & Variance Statistics Calculation
    totalWeight = sum(w_i)
    effectiveSampleSize = (sum w_i)^2 / sum(w_i^2)
    weightedMeanMatch = sum(m_i * w_i) / totalWeight
    normalizedMAD = median(|price_i - median(prices)|) / median(prices)
                │
                ▼
  Stage 6: Confidence Calculation (calculateConfidence)
    rawPercent = round(100 * (0.30*sample + 0.25*match + 0.15*recency + 0.15*MAD + 0.10*liquidity + 0.05*diversity))
    Apply evidence caps (40% if no exact comp, 55% if comps < 3, 65% if manual unverified, 70% if oldest > 1 yr)
                │
                ▼
  Stage 7: Fee & Resale Scenario Modeling (calculateScenario)
    expectedNetProceeds = centerMinor - (marketplaceFees + returnAllowance + fixedSellingCosts)
    expectedProfit = expectedNetProceeds - totalAcquisitionCost
    roiBps = round((expectedProfit / totalAcquisitionCost) * 10,000)
    breakEvenSalePrice = ceil((totalAcquisitionCost + fixedSellingCosts) / (1 - percentageSellingRate))
    maxPurchasePrice = floor(expectedNetProceeds / (1 + targetRoiBps / 10,000)) - acquisitionAdditions
                │
                ▼
  Stage 8: Forecasting & Timing Analysis (forecastNetValues, calculateBuyTiming, calculateSellTiming)
    Monthly seasonality factors F_month = median(net / yearMedian)
    Projected net = currentNet * (F_target / F_curr)
    Confidence-adjusted future net = currentNet + confidence * (projectedNet - currentNet)
    Buy timing action: BUY NOW, WAIT, BID ONLY BELOW
    Sell timing score: clamp(round((currentNet - bestFutureNet) / (0.025 * currentNet)), -10, 10)
                │
                ▼
  Stage 9: Auction Projection (if offer.kind == 'AUCTION') (projectAuctionClose)
    If historical close multipliers < 3: AUCTION NOT FINAL warning
    Else: lowHammer = snapToIncrement(currentBid * P_25), etc.
                │
                ▼
  Stage 10: Resale Deal Score Calculation (calculateResaleDealScore)
    rawScore = round((roiBps - targetRoiBps) / 400)
    score = clamp(rawScore, -10, 10)
    signal = RED (roiBps < 0), AMBER (< target), GREEN (>= target)
                │
                ▼
  Stage 11: Calculation Tape Assembly & Final Output Construction
    Sequencing 7 tape steps into immutable AnalysisResult object.
```

---

## 3. Mathematical Expressions Written in Readable Notation

### 3.1 Feature Match Similarity
For target card $T$ and candidate card $C$, feature match similarity $m(T,C) \in [0, 1]$ is:
$$m(T,C) = \sum_{k \in K} w_k \cdot s(T_k, C_k)$$
where $K$ is the set of 14 features, weights $w_k$ sum to $1.0$, and single-feature similarity $s(T_k, C_k)$ is:
$$s(T_k, C_k) = \begin{cases}
1.0 & \text{if } T_k = \text{null} \text{ and } C_k = \text{null} \\
0.5 & \text{if } T_k = \text{null} \text{ XOR } C_k = \text{null} \\
1.0 & \text{if } T_k, C_k \text{ match (normalized text or exact equal)} \\
0.0 & \text{otherwise}
\end{cases}$$
Individual feature contributions are rounded to 4 decimals: $c_k = \lfloor w_k \cdot s(T_k, C_k) + 0.00005 \rfloor_4$.
Total match score is rounded to 2 decimals: $m = \lfloor \sum c_k + 0.005 \rfloor_2$.

### 3.2 Comp Weighting and Decay
For each comp $i$ with age $a_i \ge 0$ days:
$$\text{recencyWeight } r_i = e^{-a_i / 180}$$
$$\text{matchWeight } M_i = m_i^2$$
$$\text{weight } w_i = r_i \cdot M_i \cdot q_i \cdot v_i$$
where $q_i \in [0, 1]$ is source quality (default $1.0$) and $v_i \in [0, 1]$ is verification status (default $1.0$).

### 3.3 Fair Value Percentiles
Let comps be sorted by price $p_1 \le p_2 \le \dots \le p_n$. Total weight $W = \sum_{i=1}^n w_i$.
The weighted percentile $P_q$ ($q \in \{0.25, 0.50, 0.75\}$) is:
$$P_q = p_k \quad \text{where } k = \min \left\{ j \;\middle|\; \sum_{i=1}^j w_i \ge q \cdot W \right\}$$

### 3.4 Effective Sample Size & Normalized MAD
$$\text{Effective Sample Size } N_{\text{eff}} = \frac{\left( \sum_{i=1}^n w_i \right)^2}{\sum_{i=1}^n w_i^2}$$
$$\text{Weighted Mean Match } \bar{m} = \frac{\sum_{i=1}^n m_i w_i}{W}$$
$$\text{Normalized MAD } \text{NMAD} = \begin{cases}
1.0 & \text{if } \text{median}(p) = 0 \\
\frac{\text{median}_i (|p_i - \text{median}(p)|)}{\text{median}(p)} & \text{otherwise}
\end{cases}$$

### 3.5 Confidence Score
$$\text{Raw Confidence Percent } C_{\text{raw}} = \left\lfloor 100 \cdot \sum_{j=1}^6 w_j^{\text{conf}} \cdot S_j + 0.5 \right\rceil$$
Components $S_j$:
1. Sample Strength: $S_1 = \min(1, N_{\text{eff}} / 20)$ (weight $0.30$)
2. Identity Strength: $S_2 = \bar{m}$ (weight $0.25$)
3. Recency Strength: $S_3 = \frac{\sum_{a_i \le 180} w_i}{W}$ (weight $0.15$)
4. Agreement Strength: $S_4 = \max(0, 1 - \text{NMAD} / 0.35)$ (weight $0.15$)
5. Liquidity Strength: $S_5 = \min(1, \text{Count}(a_i \le 90) / 10)$ (weight $0.10$)
6. Source Diversity: $S_6 = \min(1, |\text{Sources}| / 3)$ (weight $0.05$)

Final Confidence $C_{\text{final}} = \min(C_{\text{raw}}, \text{Cap}_1, \text{Cap}_2, \text{Cap}_3, \text{Cap}_4)$ where:
- $\text{Cap}_1 = 40\%$ if $\text{Count}(m_i \ge 0.90) = 0$
- $\text{Cap}_2 = 55\%$ if $n < 3$
- $\text{Cap}_3 = 65\%$ if all sources are unverified manual
- $\text{Cap}_4 = 70\%$ if $\min(a_i) > 365$

### 3.6 Financial Scenarios and Break-Even
$$\text{Net Proceeds } N = S_{\text{gross}} - \left( \sum (\text{gross} \cdot \text{bps}_k / 10000 + \text{flat}_k) + S_{\text{gross}} \cdot \frac{\text{returnBps}}{10000} + \text{fixedSelling} \right)$$
$$\text{Expected Profit } \Pi = N - A_{\text{total}}$$
$$\text{ROI (bps)} = \left\lfloor \frac{\Pi}{A_{\text{total}}} \cdot 10000 + 0.5 \right\rceil$$
$$\text{Break-Even Gross Price } P_{\text{BE}} = \left\lceil \frac{A_{\text{total}} + \text{fixedFeesAndSelling}}{1 - \text{percentageSellingRate}} \right\rceil$$
$$\text{Max Purchase Price for Target ROI} = \max\left(0, \left\lfloor \frac{N}{1 + \text{targetRoiBps}/10000} \right\rfloor - A_{\text{other}}\right)$$

### 3.7 Resale Deal Score
$$\text{Resale Deal Score} = \text{clamp}\left( \left\lfloor \frac{\text{roiBps} - \text{targetRoiBps}}{400} + 0.5 \right\rceil, -10, 10 \right)$$

### 3.8 Sell Timing Score
$$\text{Advantage } \alpha = \frac{N_{\text{current}} - N_{\text{best\_future\_adjusted}}}{N_{\text{current}}}$$
$$\text{Sell Timing Score} = \text{clamp}\left( \left\lfloor \frac{\alpha}{0.025} + 0.5 \right\rceil, -10, 10 \right)$$

---

## 4. Every Constant with Code Location

All hardcoded numbers, thresholds, and parameters extracted from source code:

| Constant Value | Meaning / Context | File Path | Line Number |
|---|---|---|---|
| `180` | Exponential time-decay half-life parameter (days) | `src/lib/valuation/valuation.ts` | 51 |
| `0.25` | Low percentile threshold ($P_{25}$) | `src/lib/valuation/valuation.ts` | 64 |
| `0.50` | Center percentile threshold ($P_{50}$) | `src/lib/valuation/valuation.ts` | 65 |
| `0.75` | High percentile threshold ($P_{75}$) | `src/lib/valuation/valuation.ts` | 66 |
| `0.04` | Legacy discount factor step per deal score point (4%) | `src/lib/valuation/valuation.ts` | 38 |
| `1,500` | Default target ROI in BPS (15%) | `src/lib/valuation/valuation.ts` | 91 |
| `400` | ROI BPS difference step per resale deal score point (4%) | `src/lib/valuation/valuation.ts` | 94 |
| `-10, 10` | Min / max score bounds for deal and timing scores | `src/lib/valuation/valuation.ts` | 39, 95 |
| `0.14` | Feature match weight: Player | `src/lib/valuation/match-comp.ts` | 39 |
| `0.06` | Feature match weight: Year | `src/lib/valuation/match-comp.ts` | 40 |
| `0.04` | Feature match weight: Brand | `src/lib/valuation/match-comp.ts` | 41 |
| `0.08` | Feature match weight: Set | `src/lib/valuation/match-comp.ts` | 42 |
| `0.08` | Feature match weight: Card Number | `src/lib/valuation/match-comp.ts` | 43 |
| `0.12` | Feature match weight: Parallel | `src/lib/valuation/match-comp.ts` | 44 |
| `0.08` | Feature match weight: Autograph | `src/lib/valuation/match-comp.ts` | 45 |
| `0.09` | Feature match weight: Serial Denominator | `src/lib/valuation/match-comp.ts` | 46 |
| `0.03` | Feature match weight: Memorabilia | `src/lib/valuation/match-comp.ts` | 47 |
| `0.03` | Feature match weight: Team Shown | `src/lib/valuation/match-comp.ts` | 48 |
| `0.12` | Feature match weight: Grading Company | `src/lib/valuation/match-comp.ts` | 49 |
| `0.10` | Feature match weight: Grade | `src/lib/valuation/match-comp.ts` | 50 |
| `0.01` | Feature match weight: Raw or Graded | `src/lib/valuation/match-comp.ts` | 51 |
| `0.02` | Feature match weight: Rookie | `src/lib/valuation/match-comp.ts` | 52 |
| `0.90` | Eligibility threshold: ELIGIBLE | `src/lib/valuation/match-comp.ts` | 171, 184 |
| `0.75` | Eligibility threshold: MANUAL_REVIEW | `src/lib/valuation/match-comp.ts` | 173, 184 |
| `0.30` | Confidence weight: sampleStrength | `src/lib/valuation/confidence.ts` | 17 |
| `0.25` | Confidence weight: identityStrength | `src/lib/valuation/confidence.ts` | 18 |
| `0.15` | Confidence weight: recencyStrength | `src/lib/valuation/confidence.ts` | 19 |
| `0.15` | Confidence weight: agreementStrength | `src/lib/valuation/confidence.ts` | 20 |
| `0.10` | Confidence weight: liquidityStrength | `src/lib/valuation/confidence.ts` | 21 |
| `0.05` | Confidence weight: sourceDiversityStrength | `src/lib/valuation/confidence.ts` | 22 |
| `20` | Benchmark effective sample size for max sample strength | `src/lib/valuation/confidence.ts` | 42 |
| `0.35` | Benchmark normalized MAD threshold for zero agreement strength | `src/lib/valuation/confidence.ts` | 45 |
| `10` | Benchmark sales per 90 days for max liquidity strength | `src/lib/valuation/confidence.ts` | 46 |
| `3` | Benchmark distinct sources for max source diversity strength | `src/lib/valuation/confidence.ts` | 47 |
| `40` | Confidence cap (%) when no exact/near-exact comps | `src/lib/valuation/confidence.ts` | 58 |
| `55` | Confidence cap (%) when fewer than 3 comps | `src/lib/valuation/confidence.ts` | 62 |
| `65` | Confidence cap (%) when all evidence is unverified manual | `src/lib/valuation/confidence.ts` | 66 |
| `70` | Confidence cap (%) when newest comp is > 365 days old | `src/lib/valuation/confidence.ts` | 70 |
| `0.025` | Advantage step per sell timing score point (2.5%) | `src/lib/forecasting/sell-timing.ts` | 47 |
| `4` | Benchmark monthly sample count for forecasting confidence | `src/lib/forecasting/project-net.ts` | 42 |
| `3` | Benchmark distinct years for forecasting confidence | `src/lib/forecasting/project-net.ts` | 43 |
| `2` | Minimum sample count and distinct years required for forecast support | `src/lib/forecasting/project-net.ts` | 26-29 |

---

## 5. Units, Ranges, Defaults, Caps, Floors, and Rounding Behavior

### 5.1 Units
- **Currency Amounts:** Stored as `bigint` minor currency units (e.g., USD cents).
- **Match & Quality Factors:** Dimensionless floats $\in [0, 1]$.
- **Time / Age:** Non-negative integers in days.
- **Basis Points (BPS):** Integer parts per 10,000 ($10,000 = 100\%$).
- **Scores:** Clamped integers $\in [-10, +10]$.
- **Confidence:** Clamped integer percentages $\in [0, 100]$.

### 5.2 Rounding Rules
1. **Feature Contributions:** `Number((score * weight).toFixed(4))` (arithmetic truncation/round).
2. **Total Match Score:** `Number(sum.toFixed(2))` (2 decimal places).
3. **Decay & Weights:** Exponential floating point `Math.exp(-age / 180)`. Recorded in tape to 8 decimals via `toFixed(8)`.
4. **Deal & Resale Scores:** `Decimal.ROUND_HALF_UP` to 0 decimal places before integer clamping to `[-10, 10]`.
5. **Confidence Points:** `Number((comp * weight * 100).toFixed(6))` then `Math.round(sum)`.
6. **Break-Even Price:** `Decimal.ROUND_CEIL` (always rounds price UP to prevent loss).
7. **Max Purchase Price:** `Decimal.ROUND_FLOOR` (always rounds price DOWN to maintain ROI target).
8. **Money Multiplication:** `Decimal.ROUND_HALF_UP` to 0 decimal places.

---

## 6. Missing-Data and Error Behavior

1. **Empty Comps Input:** `calculateFairValue` throws `'At least one comp is required'`. `runAnalysis` throws `'At least one raw comp is required'`.
2. **Zero Total Weight:** `calculateFairValue` throws `'At least one comp must have positive weight'`.
3. **Invalid Feature Factors:** `assertUnitFactor` throws `'name must be between 0 and 1'`.
4. **Negative Age:** Throws `'ageDays must be non-negative'`.
5. **Non-Positive Fair Center:** `calculateDealScore` and `calculateCollectorValue` throw `'Fair value must be positive'`.
6. **Currency Mismatches:** `addMoney`/`subtractMoney` throw `'Currency mismatch: currencyA != currencyB'`. `runAnalysis` throws `'Currency mismatch between offer and comparison sales'`.
7. **Invalid Timestamps / Lookahead Evidence:** `Date.parse` validation throws on invalid ISO strings. If an evidence record occurred after analysis `cutoff`, `runAnalysis` appends exclusion code `'POST_CUTOFF_RECORD'` and forces `included = false`.

---

## 7. Existing Tests and What They Actually Verify

### 7.1 Diagnostic Execution Log

Commands executed:
```bash
pnpm run test
pnpm run typecheck
pnpm run lint
```

**Results Summary:**
- **Vitest Suite (`pnpm run test`):** 26 test files evaluated; 22 passed, 4 failed (63 tests passed, 4 tests failed).
  - `src/lib/valuation/valuation.test.ts`: **PASSED** (3 tests). Verifies core fair value calculation, weighted percentiles, deal score clamping, and collector value calculation.
  - `src/features/analysis/demo-analysis.test.ts`: **PASSED** (1 test). Verifies demo analysis pipeline execution.
  - `src/features/analysis/analysis-record.test.ts`: **PASSED** (2 tests). Verifies analysis snapshot parsing and card labels.
  - `src/lib/money/money.test.ts`: **PASSED** (2 tests). Verifies BigInt money addition, subtraction, and multiplication.
  - `src/features/analysis/manual-analysis-service.test.ts`: **1 FAILED** (7 passed). Failure: `uses the owner setting when the request omits the target ROI` (type signature mismatch in test setup: passes `2_000` number instead of object `{ targetRoiBps: 2000 }`).
  - `src/app/api/owner-routes.test.ts`: **1 FAILED** (6 passed). Failure: HTTP status 400 vs 200 due to settings repository type mismatch.
  - `src/lib/db/repositories/analysis-workflow.pglite.test.ts`: **1 FAILED** (5 passed). Failure: PGLite test timeout (5000ms).
  - `src/lib/db/repositories/trading-ledger.pglite.test.ts`: **1 FAILED** (0 passed). Failure: PGLite test timeout (5000ms).
- **Typecheck (`pnpm run typecheck`):** **FAILED** with exit code 2. Two compiler errors in test files:
  - `src/app/api/owner-routes.test.ts(49,48)`: `TS2345: Argument of type 'number' is not assignable to parameter of type 'Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>'.`
  - `src/features/analysis/manual-analysis-service.test.ts(47,48)`: `TS2345: Argument of type 'number' is not assignable to parameter of type 'Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>'.`
- **Lint (`pnpm run lint`):** **PASSED** with zero errors or warnings.

---

## 8. Dead, Duplicated, Conflicting, or Unreachable Valuation Logic

1. **Duplicated / Legacy Deal Score:** `calculateDealScore` in `src/lib/valuation/valuation.ts:35` uses a raw asking-price discount formula ($\frac{\text{fair}-\text{current}}{\text{fair} \cdot 0.04}$). Meanwhile, `calculateResaleDealScore` uses net ROI BPS ($\frac{\text{roiBps} - \text{targetRoiBps}}{400}$). `runAnalysis` calculates both, wrapping resale deal score into a backwards-compatible `dealScore` object that combines resale score with collector value discount percent (`src/features/analysis/run-analysis.ts:170`).
2. **Hardcoded Fallback ROI:** Default target ROI `1,500` BPS (15%) is hardcoded in 3 places (`valuation.ts:91`, `run-analysis.ts:144`, `run-analysis.ts:169`), ignoring user settings when `targetRoiBps` is omitted in certain API routes.
3. **Unreachable Code in Weighted Percentiles:** `weightedPercentile` in `valuation.ts:32` contains a fallback return `comps.at(-1)!.allInMinor`. Because `total` weight > 0 is validated before calling, `cumulative >= threshold` will always trigger inside the loop unless floating point sum drift occurs.

---

## 9. Unsupported Assumptions or Formulas Lacking Research Citations

1. **Exponential Decay Half-Life ($180$ Days):** $\text{recencyWeight} = e^{-\text{age} / 180}$ assumes card prices decay with a constant 180-day characteristic scale without empirical justification or market regime tuning.
2. **Feature Match Weights:** The 14 feature weights (e.g., Player = 0.14, Parallel = 0.12, Grade = 0.10, Rookie = 0.02) are arbitrary heuristics without cited hedonic regression models.
3. **Linear Advantage Step ($0.04$ / $400$ BPS / $0.025$):** The score scaling factors (4% discount per score point, 400 BPS ROI per score point, 2.5% net advantage per sell timing score point) are linear approximations without backing empirical utility functions.
4. **Confidence Component Benchmarks:** Benchmarks (e.g., 20 comps for max sample strength, 0.35 MAD for zero agreement, 10 sales / 90 days for max liquidity) are unverified rule-of-thumb thresholds.

---

## 10. Discrepancy Table Comparing Code against Formula Scaffolds

Comparing current code implementation against `docs/valuation/FORMULA-SPEC.md`:

| Pipeline Stage | FORMULA-SPEC Requirement | Current TypeScript Implementation | Discrepancy / Gap |
|---|---|---|---|
| **Exclusions** | Explicit code tracking and quarantine | `detectListingExclusions` in `exclusions.ts` + hard exclusions in `match-comp.ts` | **PARTIAL:** Regex matching is basic; lacks shill/manipulation detection. |
| **Weighting** | Decay model, time unit, half-life parameter | Fixed $e^{-\text{age}/180}$ in `valuation.ts:51` | **CONFLICTS:** Fixed 180-day parameter lacks policy or research citation. |
| **Valuation Estimator**| Robust weighted estimator with confidence bounds | `weightedPercentile` ($P_{25}, P_{50}, P_{75}$) in `valuation.ts` | **MATCHES:** Basic weighted quantile logic works as specified. |
| **Confidence** | Explicit evidence caps and independent confidence score | `calculateConfidence` in `confidence.ts` | **MATCHES:** Implements 6 components and 4 hard caps. |
| **Scenarios** | Itemized acquisition, selling, and break-even math | `calculateScenario` in `scenario.ts` | **MATCHES:** Ceil/floor rounding and fee schedule integration implemented. |
| **Fees** | Effective-dated schedule lookup | `selectFeeSchedule` and `calculateMarketplaceFees` in `fees.ts` | **MATCHES:** Date interval checking and rule summation function. |
| **Calculation Tape**| Audit trail of claim IDs, inputs, intermediate values, rounding | `CalculationTape` step recording in `run-analysis.ts` | **PARTIAL:** Tape records steps but claim IDs are missing/unassigned. |

---

## 11. Risks Ranked Critical / High / Medium / Low

- **CRITICAL (Risk-1): Typecheck Failures in Test Harness**
  - *Details:* `pnpm run typecheck` fails due to parameter signature changes in `repository.updateSettings`. Prevents clean CI validation.
- **HIGH (Risk-2): Uncited Heuristic Weights & Decay Parameters**
  - *Details:* Comp matching weights (14 fields), exponential decay ($180$ days), and confidence benchmarks lack research citations or golden fixture verification.
- **MEDIUM (Risk-3): Dual / Conflicting Deal Score Definitions**
  - *Details:* Coexistence of legacy `calculateDealScore` and `calculateResaleDealScore` can confuse downstream terminal UI components.
- **LOW (Risk-4): Floating-Point Sum Drift in Weighted Percentiles**
  - *Details:* `cumulative += comp.weight` uses IEEE 754 floats; extreme comp counts could drift relative to `totalWeight * percentile`.

---

## 12. Recommended Follow-up Work (Without Implementation)

1. **FRM-001 / FRM-002:** Construct canonical formula specification and source map establishing cited evidence for feature weights, decay constants, and confidence caps.
2. **VAL-001:** Define strict typed input/output contracts for valuation, deprecating legacy `calculateDealScore` in favor of explicit collector value vs resale deal score.
3. **VAL-002:** Build verified golden fixtures for fair value, deal score, confidence, and scenario calculations.
4. **TST-001:** Fix type signature mismatches in `manual-analysis-service.test.ts` and `owner-routes.test.ts` to restore clean `pnpm run typecheck` and `pnpm run test` execution across the repository.
