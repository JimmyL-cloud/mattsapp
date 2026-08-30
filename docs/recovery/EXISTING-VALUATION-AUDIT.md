# Existing Valuation Engine Audit Report

**Date:** August 30, 2026
**Repository Branch:** `repair/mattsapp-test`
**Target Commit:** `2b9007c98c7b375133bc642b14a5aff85148aa73`

---

## 1. Valuation-Related Source Files and Responsibilities

The existing valuation engine in `mattsapp` is organized into pure calculation modules (`src/lib/valuation/`), forecasting & timing modules (`src/lib/forecasting/`), money/audit primitives (`src/lib/money/`, `src/lib/audit/`), identity utilities (`src/features/cards/`), orchestration pipelines (`src/features/analysis/`), database schemas (`src/lib/db/schema/core.ts`), and workflow repositories (`src/lib/db/repositories/analysis-workflow.ts`).

### A. Core Calculation Engine (`src/lib/valuation/`)
* **`src/lib/valuation/valuation.ts`**: Core valuation calculations. Implements exponential decay-weighted fair value range percentiles (`calculateFairValue`), raw discount deal score (`calculateDealScore`), target ROI-based resale deal score (`calculateResaleDealScore`), and evidence-only collector value (`calculateCollectorValue`).
* **`src/lib/valuation/match-comp.ts`**: Card comp identity matching (`matchComp`). Evaluates 14 identity attributes with assigned weights, detects regex/property exclusion codes, applies eligibility thresholds (`0.90` / `0.75`), and flags cross-grader or grade/raw adjustment requirements.
* **`src/lib/valuation/confidence.ts`**: Evidence confidence evaluation (`calculateConfidence`). Computes 6 component strength metrics (sample, identity, recency, agreement, liquidity, source diversity) and applies evidence capping rules (missing exact comps, sample size < 3, single unverified manual source, stale evidence > 1 year).
* **`src/lib/valuation/scenario.ts`**: Net proceeds and return calculation (`calculateScenario`). Computes total acquisition cost, itemized selling costs, effective marketplace fees, net proceeds, ROI bps, annualized ROI bps, break-even sale price, minimum sale price for target ROI, and maximum purchase price for target ROI. Generates audit tape steps.
* **`src/lib/valuation/fees.ts`**: Marketplace fee schedule evaluation (`selectFeeSchedule`, `calculateMarketplaceFees`). Selects effective fee schedules by timestamp and calculates itemized percentage (basis points) plus flat minor-unit fees.
* **`src/lib/valuation/auction.ts`**: Auction outcome projection (`projectAuctionClose`). Calculates current bid all-in price, hammer price quantiles (25th, 50th, 75th) snapped to bid increments, and projected all-in close prices with deal scores.
* **`src/lib/valuation/exclusions.ts`**: Listing-level exclusion detection (`detectListingExclusions`). Uses regular expressions to detect lots, reprints, sealed boxes, break spots, cancelled transactions, duplicate records, and unknown accepted offers from listing titles/metadata.

### B. Forecasting & Timing (`src/lib/forecasting/`)
* **`src/lib/forecasting/project-net.ts`**: Seasonal net value forecasting (`forecastNetValues`). Projects expected net proceeds across specified time horizons (e.g., 7, 30, 90, 180, 365 days) using historical monthly seasonality factors.
* **`src/lib/forecasting/seasonality.ts`**: Seasonality profile construction (`buildMonthlySeasonality`). Filters out lookahead evidence, calculates annual medians, normalizes monthly observations, and constructs monthly seasonality factors (`factor`, `sampleCount`, `distinctYears`).
* **`src/lib/forecasting/buy-timing.ts`**: Buy timing outlook evaluation (`calculateBuyTiming`). Compares confidence-adjusted entry prices against transaction costs and minimum timing edge to recommend `BUY NOW`, `WAIT`, `BID ONLY BELOW`, or `NO RELIABLE BUY-TIMING EDGE`.
* **`src/lib/forecasting/sell-timing.ts`**: Sell timing score and recommendation (`calculateSellTiming`). Computes confidence-adjusted future projected net values, calculates sell-now advantage, and produces a signed score (`-10` to `10`) and timing recommendation.
* **`src/lib/forecasting/confidence-adjustment.ts`**: Confidence-weighted value interpolation (`confidenceAdjustedValue`). Applies linear confidence weighting between current fair value/net and raw projected future values.

### C. Primitives & Identity (`src/lib/money/`, `src/lib/audit/`, `src/features/cards/`)
* **`src/lib/money/money.ts`**: Integer-safe money operations (`addMoney`, `subtractMoney`, `multiplyMoney`, `formatMoney`). Strictly enforces single-currency arithmetic in minor units (bigint).
* **`src/lib/audit/calculation-tape.ts`**: Step-by-step audit tape recorder (`CalculationTape`). Serializes calculation inputs, formulas, outputs, units, and sequence numbers into auditable JSON structures.
* **`src/features/cards/card-identity.ts`**: Card identity normalization and validation (`createCardIdentity`). Enforces required fields, year bounds (1800-2200), grade bounds (0-100), and normalizes string attributes.
* **`src/features/cards/aliases.ts`**: String normalization and equality checks (`normalizeIdentityText`, `identityTextEqual`). Removes diacritics, punctuation, and case differences for entity matching.

### D. Workflow & Persistence Orchestration (`src/features/analysis/`, `src/lib/db/`)
* **`src/features/analysis/run-analysis.ts`**: Master valuation pipeline orchestrator (`runAnalysis`). Binds comp matching, cutoff filtering, fair value percentile calculation, confidence evaluation, scenario math, seasonality forecasting, buy/sell timing, auction projections, and calculation tape assembly into an immutable result object.
* **`src/features/analysis/manual-analysis-service.ts`**: API service layer (`ManualAnalysisService`). Validates requests via `manualAnalysisRequestSchema` (Zod), enforces future-date checks, tracks evidence provenance (`MANUAL` / `CSV`), calculates analyses, and persists immutable snapshots to the database repository.
* **`src/features/analysis/demo-analysis.ts`**: Demo fixture generator (`createDemoAnalysisInput`, `createDemoAnalysis`). Provides fixture data for demo routes and isolated tests.
* **`src/lib/db/schema/core.ts`**: Drizzle PostgreSQL schema definitions for `analyses`, `compMatchResults`, `compExclusions`, `adjustmentRules`, `feeSchedules`, `analysisComps`, `analysisEvidence`, `calculationSteps`, `forecasts`, `predictionSnapshots`, `userDecisions`.
* **`src/lib/db/repositories/analysis-workflow.ts`**: Data access repository (`PostgresAnalysisWorkflowRepository`). Reads and writes analyses, calculation steps, evidence snapshots, user decisions, portfolio holdings, and settings.

---

## 2. Complete Runtime Flow

```
[ HTTP POST /api/analyses or Manual UI Form ]
                     │
                     ▼
  ManualAnalysisService.create (manual-analysis-service.ts:88)
   ├── 1. Validate Zod Request Schema (manualAnalysisRequestSchema)
   ├── 2. Check Idempotency Key & Request SHA-256 Hash Replay
   ├── 3. Fetch Owner Settings (targetRoiBps)
   ├── 4. Validate Cutoff & Evidence Dates (reject future timestamps)
   ├── 5. Normalize Target & Comp Card Identity (createCardIdentity)
   ├── 6. Load & Validate Imported CSV Evidence (if applicable)
   └── 7. Map Provenance (MANUAL / CSV, STRUCTURED vs REVIEWED_TITLE)
                     │
                     ▼
        runAnalysis (run-analysis.ts:85)
   ├── A. Calculate Offer All-In Price (price + shipping + buyerPremium)
   ├── B. Match Each Comp Candidate (matchComp: 14 attribute scores & weights)
   ├── C. Detect Listing Exclusions (detectListingExclusions: regex check for lots, reprints, etc.)
   ├── D. Apply Cutoff Filter (flag POST_CUTOFF_RECORD if occurredAt > cutoff)
   ├── E. Determine Final Comp Inclusion (automaticallyIncluded vs manualIncluded override)
   ├── F. Calculate Fair Value Range (calculateFairValue)
   │     ├── Comp Recency Weight: exp(-ageDays / 180)
   │     ├── Comp Match Weight: matchScore²
   │     ├── Total Comp Weight: recency * matchWeight * sourceQuality * verification
   │     ├── Sort Comps by All-In Price (minor units)
   │     └── Calculate Weighted Percentiles: 25th (low), 50th (center), 75th (high)
   ├── G. Calculate Collector Value (calculateCollectorValue)
   │     └── Difference % = (fairCenter - askingPrice) / fairCenter
   ├── H. Calculate Evidence Confidence (calculateConfidence)
   │     ├── Compute 6 Strength Metrics (sample, identity, recency, agreement, liquidity, diversity)
   │     ├── Sum Weighted Points (max 100)
   │     └── Apply Evidence Caps (no exact comps -> 40%, <3 comps -> 55%, unverified -> 65%, stale > 1yr -> 70%)
   ├── I. Calculate Financial Scenario (calculateScenario)
   │     ├── Total Acquisition = purchasePrice + acquisitionCosts
   │     ├── Marketplace Fees = calculateMarketplaceFees(fairCenter, feeSchedule)
   │     ├── Total Selling Costs = fees + returnAllowance + fixedSellingCosts
   │     ├── Expected Net Proceeds = fairCenter - totalSellingCosts
   │     ├── ROI Bps = round((netProceeds - totalAcquisition) / totalAcquisition * 10,000)
   │     ├── Annualized ROI Bps = ((1 + ROI)^(365/holdingDays) - 1) * 10,000
   │     ├── Break-Even Gross Price = (acquisition + fixedSelling) / (1 - percentageSellingRate)
   │     └── Max Purchase Price for Target ROI = maxAcquisition - acquisitionCosts
   ├── J. Calculate Seasonality Forecasts (forecastNetValues -> buildMonthlySeasonality)
   ├── K. Calculate Sell Timing Outlook (calculateSellTiming)
   ├── L. Calculate Buy Timing Outlook (calculateBuyTiming)
   ├── M. Project Auction Close (if offer.kind === 'AUCTION') (projectAuctionClose)
   ├── N. Calculate Resale Deal Score (calculateResaleDealScore)
   │     ├── Score = clamp(round((roiBps - targetRoiBps) / 400), -10, 10)
   │     └── Signal = RED (if ROI < 0), AMBER (if ROI < target), GREEN (if ROI >= target)
   └── O. Assemble Resequenced Calculation Tape (steps 1..N)
                     │
                     ▼
  PostgresAnalysisWorkflowRepository.createAnalysis (analysis-workflow.ts:252)
   └── Persist immutable record across analyses, prediction_snapshots, calculation_steps, analysis_evidence, user_decisions
```

---

## 3. Formulas, Constants, Thresholds, Multipliers, Decay Rates, and Defaults

### A. Card Identity Comp Matching (`src/lib/valuation/match-comp.ts`)
* **Attribute Weights (Sum = 1.00)** (lines 36–51):
  * `player`: `0.14`
  * `year`: `0.06`
  * `brand`: `0.04`
  * `set`: `0.08`
  * `cardNumber`: `0.08`
  * `parallel`: `0.12`
  * `autograph`: `0.08`
  * `serialDenominator`: `0.09`
  * `memorabilia`: `0.03`
  * `teamShown`: `0.03`
  * `gradingCompany`: `0.12`
  * `grade`: `0.10`
  * `rawOrGraded`: `0.01`
  * `rookie`: `0.02`
* **Attribute Comparison Scores** (lines 53–60):
  * Both `null`: `1.0`
  * One `null`: `0.5`
  * Normalized string match or exact value match: `1.0`, else `0.0`.
* **Attribute Contribution**: `contribution = Number((score * weight).toFixed(4))` (line 66).
* **Match Total**: `total = Number(sum(contributions).toFixed(2))` (lines 161–163).
* **Eligibility Thresholds** (lines 170–176, 182):
  * `ELIGIBLE`: `total >= 0.90` (and no hard exclusions or required manual reviews).
  * `MANUAL_REVIEW`: `0.75 <= total < 0.90` (or requires manual review for cross-grader/grade/raw).
  * `EXCLUDED`: `total < 0.75` (or hard exclusion code present).
* **Hard Exclusions** (lines 87–105): `SUSPECTED_LOT`, `REPRINT_OR_FACSIMILE`, `SEALED_PRODUCT`, `BREAK_OR_SPOT`, `CANCELLED_TRANSACTION`, `DUPLICATE_RECORD`, `UNKNOWN_ACCEPTED_OFFER`, `WRONG_PLAYER`, `WRONG_YEAR`, `WRONG_SET`, `WRONG_CARD_NUMBER`, `WRONG_PARALLEL`, `WRONG_AUTOGRAPH_TYPE`, `WRONG_SERIAL_DENOMINATOR`, `CROSS_GRADER_NO_CONVERSION`.

### B. Fair Value Range (`src/lib/valuation/valuation.ts`)
* **Recency Weight Decay**: $\text{recencyWeight} = \exp(-\text{ageDays} / 180)$ (line 52). Exponential decay parameter = 180 days.
* **Match Weight Transformation**: $\text{matchWeight} = \text{match}^2$ (line 53).
* **Total Comp Weight**: $\text{weight} = \text{recencyWeight} \times \text{matchWeight} \times \text{sourceQualityWeight} \times \text{verificationWeight}$ (line 59).
* **Source Quality & Verification Defaults**: `sourceQuality ?? 1`, `verification ?? 1` (lines 47–48).
* **Weighted Percentiles** (lines 20–28, 62–64):
  * Low Fair Value: 25th weighted percentile (`0.25`).
  * Center Fair Value: 50th weighted percentile (`0.50`).
  * High Fair Value: 75th weighted percentile (`0.75`).

### C. Deal & Valuation Scores (`src/lib/valuation/valuation.ts`)
* **Raw Discount Deal Score** (lines 31–36):
  * $\text{discount} = \frac{\text{fairCenter} - \text{currentAllIn}}{\text{fairCenter}}$
  * $\text{rawScore} = \text{round}\left(\frac{\text{discount}}{0.04}\right)$ (1 score point per 4% discount).
  * $\text{score} = \text{clamp}(\text{rawScore}, -10, 10)$.
* **Resale Deal Score** (lines 89–102):
  * $\text{rawScore} = \text{round}\left(\frac{\text{roiBps} - \text{targetRoiBps}}{400}\right)$ (1 score point per 400 bps / 4% ROI difference).
  * $\text{score} = \text{clamp}(\text{rawScore}, -10, 10)$.
  * Target ROI Default: `1,500` bps (15%).
  * Signals: `RED` if $\text{roiBps} < 0$, `AMBER` if $\text{roiBps} < \text{targetRoiBps}$, `GREEN` if $\text{roiBps} \ge \text{targetRoiBps}$.
* **Collector Value** (lines 108–120):
  * $\text{differencePercent} = \frac{\text{fairCenter} - \text{askingPrice}}{\text{fairCenter}} \times 100$.
  * Signal: Constant `'EVIDENCE_ONLY'`.

### D. Evidence Confidence (`src/lib/valuation/confidence.ts`)
* **Category Weights (Sum = 1.00)** (lines 14–21):
  * `sampleStrength`: `0.30` (normalized against max sample of `20` comps).
  * `identityStrength`: `0.25` (weighted mean match score).
  * `recencyStrength`: `0.15` (share of weight from comps $\le 180$ days old).
  * `agreementStrength`: `0.15` ($\max(0, 1 - \text{normMAD} / 0.35)$).
  * `liquidityStrength`: `0.10` (normalized against `10` sales per 90 days).
  * `sourceDiversityStrength`: `0.05` (normalized against `3` distinct sources).
* **Contribution Points**: $\text{round}(100 \times \text{componentStrength} \times \text{weight})$.
* **Raw Confidence Percent**: $\text{round}(\sum \text{contributionPoints})$.
* **Evidence Capping Rules** (lines 69–84):
  * No exact or near-exact comp ($\text{match} \ge 0.90$ count = 0): Cap at **40%** (`NO_EXACT_OR_NEAR_EXACT_COMP`).
  * Fewer than 3 included comps: Cap at **55%** (`FEWER_THAN_THREE_COMPS`).
  * All evidence from single unverified manual source: Cap at **65%** (`ONE_UNVERIFIED_MANUAL_SOURCE`).
  * Newest included comp > 365 days old: Cap at **70%** (`STALE_EVIDENCE_OVER_ONE_YEAR`).

### E. Financial Scenario & Return Math (`src/lib/valuation/scenario.ts`)
* **Return Allowance Fee**: $\text{grossSale} \times \frac{\text{returnAllowanceBps}}{10,000}$.
* **Annualized ROI**: $\left(1 + \text{ROI}\right)^{\frac{365}{\text{holdingDays}}} - 1$ (if $\text{holdingDays} > 0$ and $\text{ROI} > -100\%$).
* **Percentage Selling Costs Rate**: $\text{retainedRate} = 1 - \frac{\text{feeBps} + \text{returnAllowanceBps}}{10,000}$.
* **Break-Even Sale Price**: $\text{ceil}\left(\frac{\text{totalAcquisition} + \text{flatSellingCosts}}{\text{retainedRate}}\right)$.
* **Minimum Sale Price for Target ROI**: $\text{ceil}\left(\frac{\text{ceil}(\text{totalAcquisition} \times (1 + \text{targetRoi})) + \text{flatSellingCosts}}{\text{retainedRate}}\right)$.
* **Maximum Purchase Price for Target ROI**: $\text{floor}\left(\frac{\text{expectedNetProceeds}}{1 + \text{targetRoi}}\right) - \text{otherAcquisitionCosts}$.

### F. Timing & Forecasting (`src/lib/forecasting/`)
* **Seasonality Support Requirement** (`project-net.ts`: lines 24–31): Month requires $\ge 2$ samples across $\ge 2$ distinct years for both baseline and target months.
* **Confidence-Adjusted Value** (`confidence-adjustment.ts`: line 11):
  $\text{adjustedFuture} = \text{current} + (\text{rawFuture} - \text{current}) \times \text{confidence}$.
* **Sell Timing Score** (`sell-timing.ts`: lines 44–47):
  $\text{advantage} = \frac{\text{currentNet} - \text{bestFutureNet}}{\text{currentNet}}$, $\text{rawScore} = \text{round}\left(\frac{\text{advantage}}{0.025}\right)$, $\text{score} = \text{clamp}(\text{rawScore}, -10, 10)$.
  * Recommendation: $\ge 2 \implies$ `'SELL WITHIN 14 DAYS'`, $\le -2 \implies$ `'WAIT — BEST SUPPORTED WINDOW X DAYS'`, else `'NO RELIABLE TIMING EDGE'`.

---

## 4. Units and Expected Ranges

| Attribute / Parameter | Unit | Data Type | Expected Minimum | Expected Maximum | Default / Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `salePriceMinor`, `askingPriceMinor`, `currentPriceMinor` | Minor currency units (e.g. cents) | `bigint` / `number` | `1` | `2^53 - 1` (Safe Int) | None (Required) |
| `shippingMinor`, `buyerPremiumMinor`, `taxMinor` | Minor currency units | `bigint` / `number` | `0` | `2^53 - 1` | `0` |
| `buyerPremiumBps`, `sellingFeeBps`, `returnAllowanceBps` | Basis points ($1/100\text{th of }1\%$) | `number` (Int) | `0` | `9,999` (99.99%) | `0` |
| `targetRoiBps` | Basis points | `number` (Int) | `0` | `100,000` (1,000%) | `1,500` (15%) |
| `holdingDays` | Days | `number` (Int) | `0` | `3,650` (10 years) | `90` |
| `year` (Card Year) | Year | `number` (Int) | `1800` | `2200` | `null` |
| `grade` | Grade numeric scale | `number` (Float) | `0.0` | `100.0` | `null` |
| `match` / `matchScore` | Unitless score | `number` (Float) | `0.0` | `1.0` | None |
| `recencyWeight` | Exponential multiplier | `number` (Float) | `0.0` ($\text{age} \to \infty$) | `1.0` ($\text{age} = 0$) | Calculated |
| `confidence.percent` | Percentage | `number` (Int) | `0` | `100` | Calculated |
| `dealScore.score`, `resaleDeal.score`, `sellTiming.score` | Signed Score | `number` (Int) | `-10` | `+10` | Calculated |
| `roiBps` | Basis points | `number` (Int) | `-10,000` (-100%) | $+\infty$ | Calculated |

---

## 5. Test Coverage Analysis (Tested vs. Untested Calculations)

### A. Calculations WITH Tests (`src/lib/valuation/valuation.test.ts`)
* `calculateDealScore`: 1 test verifying score bounding ($8,000 \text{ vs } 10,000 \to 5$, $1,000 \text{ vs } 10,000 \to 10$, $20,000 \text{ vs } 10,000 \to -10$).
* `calculateFairValue`: 1 test verifying ordered range ($\text{low} \le \text{center} \le \text{high}$) and audit tape step presence.
* `calculateCollectorValue`: 1 test verifying signal `'EVIDENCE_ONLY'` and difference percentage.
* `calculateResaleDealScore`: 1 test verifying signal transitions (`RED` for $<0$, `AMBER` for $<1500$, `GREEN` for $\ge 1500$) and score bounds.

### B. Valuation & Timing Modules WITHOUT Dedicated Unit Tests
* **`src/lib/valuation/match-comp.ts`**: **NO unit test file**. 14-attribute scoring, exact vs near-exact thresholds ($0.90 / 0.75$), property mismatch exclusions, and cross-grader detection lack direct unit tests.
* **`src/lib/valuation/confidence.ts`**: **NO unit test file**. 6 component strength formulas, weights, point rounding, and 4 evidence capping rules lack direct unit tests.
* **`src/lib/valuation/scenario.ts`**: **NO unit test file**. Itemized cost summation, break-even sale price, minimum sale price for target ROI, maximum purchase price, and calculation tape generation lack direct unit tests.
* **`src/lib/valuation/fees.ts`**: **NO unit test file**. Date interval selection (`selectFeeSchedule`) and percentage + flat fee calculation lack direct unit tests.
* **`src/lib/valuation/auction.ts`**: **NO unit test file**. Snapped bid increments, quantile hammer price calculations, and insufficient evidence warnings lack direct unit tests.
* **`src/lib/valuation/exclusions.ts`**: **NO unit test file**. Regex detection patterns for lots, reprints, sealed boxes, break spots, and cancelled transactions lack direct unit tests.
* **`src/lib/forecasting/project-net.ts`**: **NO unit test file**. Seasonality factor multiplication and confidence calculation lack direct unit tests.
* **`src/lib/forecasting/seasonality.ts`**: **NO unit test file**. Annual median normalization, lookahead evidence filtering, and monthly factor aggregation lack direct unit tests.
* **`src/lib/forecasting/buy-timing.ts`**: **NO unit test file**. Action logic (`BUY NOW`, `WAIT`, `BID ONLY BELOW`), edge thresholds, and expected savings lack direct unit tests.
* **`src/lib/forecasting/sell-timing.ts`**: **NO unit test file**. Score clamping, sell-now advantage calculation, and recommendation strings lack direct unit tests.
* **`src/lib/forecasting/confidence-adjustment.ts`**: **NO unit test file**. Linear confidence interpolation lacks direct unit tests.

---

## 6. Formula Component Mapping Table

| Formula / Calculation Component | Source File Path | Function / Class Name | Line Numbers |
| :--- | :--- | :--- | :--- |
| Weighted Percentile Fair Value | `src/lib/valuation/valuation.ts` | `calculateFairValue` | `38–82` |
| Fair Value Comp Recency Weight | `src/lib/valuation/valuation.ts` | `calculateFairValue` | `52` |
| Fair Value Comp Match Weight | `src/lib/valuation/valuation.ts` | `calculateFairValue` | `53` |
| Discount Deal Score (-10..10) | `src/lib/valuation/valuation.ts` | `calculateDealScore` | `31–36` |
| Target ROI Resale Deal Score | `src/lib/valuation/valuation.ts` | `calculateResaleDealScore` | `89–102` |
| Evidence-Only Collector Value | `src/lib/valuation/valuation.ts` | `calculateCollectorValue` | `108–120` |
| 14-Attribute Comp Matching Score | `src/lib/valuation/match-comp.ts` | `matchComp` | `107–183` |
| Comp Eligibility Thresholds | `src/lib/valuation/match-comp.ts` | `matchComp` | `170–176` |
| Listing Text Exclusion Regexes | `src/lib/valuation/exclusions.ts` | `detectListingExclusions` | `31–42` |
| 6-Component Evidence Confidence | `src/lib/valuation/confidence.ts` | `calculateConfidence` | `45–90` |
| Evidence Confidence Capping Rules | `src/lib/valuation/confidence.ts` | `calculateConfidence` | `69–84` |
| Financial Scenario & ROI Math | `src/lib/valuation/scenario.ts` | `calculateScenario` | `31–100` |
| Break-Even & Target ROI Prices | `src/lib/valuation/scenario.ts` | `calculateScenario` | `61–79` |
| Marketplace Fee Schedule Evaluation | `src/lib/valuation/fees.ts` | `calculateMarketplaceFees` | `46–72` |
| Effective Fee Schedule Selection | `src/lib/valuation/fees.ts` | `selectFeeSchedule` | `28–44` |
| Auction Hammer Quantiles & All-In | `src/lib/valuation/auction.ts` | `projectAuctionClose` | `36–80` |
| Monthly Seasonality Profile Builder | `src/lib/forecasting/seasonality.ts` | `buildMonthlySeasonality` | `23–78` |
| Forecasted Net Values | `src/lib/forecasting/project-net.ts` | `forecastNetValues` | `12–55` |
| Buy Timing Recommendation | `src/lib/forecasting/buy-timing.ts` | `calculateBuyTiming` | `23–64` |
| Sell Timing Score & Action | `src/lib/forecasting/sell-timing.ts` | `calculateSellTiming` | `18–68` |
| Confidence Value Interpolation | `src/lib/forecasting/confidence-adjustment.ts` | `confidenceAdjustedValue` | `4–13` |
| Integer Money Operations | `src/lib/money/money.ts` | `addMoney`, `subtractMoney`, `multiplyMoney` | `9–22` |
| Calculation Tape Trace Recorder | `src/lib/audit/calculation-tape.ts` | `CalculationTape` | `14–23` |
| Master Pipeline Orchestrator | `src/features/analysis/run-analysis.ts` | `runAnalysis` | `85–259` |
| Manual Analysis Request Validation | `src/features/analysis/manual-analysis-service.ts` | `manualAnalysisRequestSchema` | `36–79` |
| Manual Analysis DB Service | `src/features/analysis/manual-analysis-service.ts` | `ManualAnalysisService.create` | `88–251` |

---

## 7. Inconsistencies, Duplicated Logic, and Hard-Coded Assumptions

### A. Documented Econometric Models vs. Actual Code Implementation
* **`AGENTS.md` vs Code Base**: `AGENTS.md` specifies complex institutional-grade econometric models:
  * Section 2A: Integrated Value Score $V_s = P_h \cdot (1 + r_{\text{excess}})^t \cdot C_i \cdot (1 + 0.15 H_z - 0.10 S_z) \cdot f(\text{Scarcity}) \cdot M$.
  * Section 2B: Heckman Two-Stage Selection Model (Selection Equation & Outcome Equation with Inverse Mills Ratio $\lambda$).
  * Section 2C: Amihud Illiquidity Ratio ($ILLIQ$).
  * Section 2D: Weibull Hazard Function ($h(t) = \lambda p (\lambda t)^{p-1}$) for bubble risk.
* **Audit Finding**: **None of these econometric models exist in the source code**. The actual runtime implementation in `src/lib/valuation/` consists of exponential decay weighted percentiles (`calculateFairValue`), heuristic basis-point score clamping, linear confidence strength summing, and monthly seasonality factor multiplication.

### B. Type Mismatch in Settings API & Manual Analysis Service
* **`ManualAnalysisService.create`** (`src/features/analysis/manual-analysis-service.ts:214`):
  ```typescript
  targetRoiBps: request.targetRoiBps ?? settings.targetRoiBps ?? 1_500,
  ```
  `settings` returned by `repository.getSettings(userId)` has type `Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>`. However, test files (`manual-analysis-service.test.ts:47` and `owner-routes.test.ts:49`) passed a raw `number` (e.g. `updateSettings('owner-1', 2_000)`).
* **Audit Finding**: This type mismatch causes `tsc --noEmit` compilation failure (**TS2345**) and causes `manual-analysis-service.test.ts` to fail because `settings.targetRoiBps` evaluates to `undefined` when `settings` is passed as a number.

### C. Coexistence of Legacy `dealScore` and New `resaleDeal`
* **`runAnalysis`** (`src/features/analysis/run-analysis.ts:213–216`):
  ```typescript
  const dealScore = Object.freeze({
    ...resaleDeal,
    discountPercent: collectorValue.differencePercent,
  });
  ```
  The system creates a composite `dealScore` object combining the ROI-based `resaleDeal` score with `collectorValue.differencePercent`. This mixes cost-inclusive resale return metrics with evidence-only gross discount metrics into a single object for backwards compatibility.

### D. Hard-Coded Unexplained Constants
* **Recency Half-Life Constant**: `180` days in `Math.exp(-comp.ageDays / 180)` (`valuation.ts:52`).
* **Deal Score Divisor**: `.04` (4%) in `discount.div('.04')` (`valuation.ts:34`).
* **Resale Score Divisor**: `400` bps (4%) in `div(400)` (`valuation.ts:94`).
* **Sell Timing Advantage Divisor**: `0.025` (2.5%) in `advantage.div(0.025)` (`sell-timing.ts:45`).
* **Confidence MAD Scale**: `0.35` in `1 - MAD / 0.35` (`confidence.ts:49`).
* **Confidence Category Denominators**: Sample size max `20` (`confidence.ts:46`), sales per 90d max `10` (`confidence.ts:50`), source diversity max `3` (`confidence.ts:51`).

---

## 8. Missing Validation, Boundary Risks, and Numerical Stability

### A. Potential Division by Zero
* **`calculateCollectorValue`** (`src/lib/valuation/valuation.ts:110`): Checks `if (fairCenterMinor <= 0n) throw new Error(...)`. However, if `askingPriceMinor` is 0 or negative, `differencePercent` can produce 100% or >100% without input boundary enforcement on asking price.
* **`calculateScenario`** (`src/lib/valuation/scenario.ts:60`): Checks `if (percentageSellingBps >= 10_000) throw new Error(...)`. If `percentageSellingBps` equals `10_000` (100%), `retainedRate` becomes `0`, causing division by zero in `divideCeil` during break-even sale price calculation.

### B. Floating Point Precision & Index Out of Bounds
* **`weightedPercentile`** (`src/lib/valuation/valuation.ts:20–28`):
  ```typescript
  function weightedPercentile(comps: readonly WeightedComp[], percentile: number, totalWeight: number): bigint {
    const threshold = totalWeight * percentile;
    let cumulative = 0;
    for (const comp of comps) {
      cumulative += comp.weight;
      if (cumulative >= threshold) return comp.allInMinor;
    }
    return comps.at(-1)!.allInMinor;
  }
  ```
  If `comps` is empty, `comps.at(-1)` returns `undefined`, causing a runtime TypeError (`Cannot read properties of undefined (reading 'allInMinor')`). `calculateFairValue` checks `!input.length`, but `weightedPercentile` itself lacks guard assertions.

### C. Numerical Underflow on Exponential Recency
* If `comp.ageDays` is very large (e.g., $10,000$ days), `Math.exp(-10000 / 180)` underflows to `0`. If all comps are extremely old, `totalWeight` becomes `0`, triggering `throw new Error('At least one comp must have positive weight')`.

---

## 9. Verification Commands Executed

The following exact commands were run on branch `repair/mattsapp-test` at commit `2b9007c98c7b375133bc642b14a5aff85148aa73`:

1. **Package Installation**:
   ```bash
   pnpm install
   ```
2. **TypeScript Typecheck**:
   ```bash
   pnpm run typecheck
   ```
3. **ESLint Validation**:
   ```bash
   pnpm run lint
   ```
4. **Vitest Unit & Integration Test Suite**:
   ```bash
   pnpm run test
   ```
5. **Next.js Production Build**:
   ```bash
   pnpm run build
   ```

---

## 10. Verification Command Results and Output Logs

### A. `pnpm install` Result
* **Status**: PASS (Exit code 0).

### B. `pnpm run typecheck` Result
* **Status**: **FAILED** (Exit code 1).
* **Output Log**:
  ```text
  $ tsc --noEmit
  src/app/api/owner-routes.test.ts(49,48): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>'.
  src/features/analysis/manual-analysis-service.test.ts(47,48): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>'.
  [ELIFECYCLE] Command failed with exit code 1.
  ```

### C. `pnpm run lint` Result
* **Status**: **PASS** (Exit code 0).
* **Output Log**:
  ```text
  $ eslint .
  ```

### D. `pnpm run test` Result
* **Status**: **FAILED** (Exit code 1). 22 test files passed, 4 test files failed (62 passed tests, 5 failed tests).
* **Summary of Failures**:
  1. `src/features/analysis/manual-analysis-service.test.ts`:
     * `ManualAnalysisService > uses the owner setting when the request omits the target ROI`: `AssertionError: expected 1500 to be 2000` (caused by settings object type mismatch in `updateSettings`).
  2. `src/app/api/owner-routes.test.ts`:
     * `authenticated analysis workflow routes > does not reveal or mutate another owner analysis, decision, settings, or watchlist`: `AssertionError: expected 400 to be 200` (caused by settings type mismatch during update).
  3. `src/lib/db/repositories/analysis-workflow.pglite.test.ts`:
     * `persists one purchase across sequential exact retries and loads the real holding`: `Error: Test timed out in 5000ms`.
     * `collapses concurrent exact retries into one transaction and one holding`: `Error: Test timed out in 5000ms`.
  4. `src/lib/db/repositories/trading-ledger.pglite.test.ts`:
     * `loads only real persisted outcomes for the authenticated owner`: `Error: Test timed out in 5000ms`.

### E. `pnpm run build` Result
* **Status**: **FAILED** (Exit code 1). Turbopack compiled routes successfully, but Next.js typechecking failed due to the TS2345 errors.
* **Output Log**:
  ```text
  ▲ Next.js 16.3.0 (Turbopack)
    Creating an optimized production build ...
  ✓ Compiled successfully in 11.4s
    Running TypeScript ...
  src/app/api/owner-routes.test.ts(49,48): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>'.
  src/features/analysis/manual-analysis-service.test.ts(47,48): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Readonly<{ targetRoiBps: number; showTraderImportTools: boolean; }>'.
  Failed to type check.
  ```
