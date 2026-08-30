# Valuation Engine Implementation Coverage & Audit Mapping

**Issue**: FRM-003
**Approved Base Branch**: `repair/mattsapp-test` (Do not target `main`)
**Audit Conducted By**: Lead Quantitative Engineer (Jules)
**Deliverable File**: `docs/valuation/IMPLEMENTATION-COVERAGE.md`

---

## 1. Executive Summary

This document provides a line-by-line quantitative audit comparing the approved econometric specification outlined in `AGENTS.md` to the TypeScript implementation located in `src/lib/valuation/` and related forecasting/analysis features.

Each approved claim from `AGENTS.md` is evaluated and classified into one of five strict statuses:
- **UNKNOWN**: Specification or implementation state requires further clarification.
- **MISSING**: Formula or specification requirement is absent from the codebase.
- **PARTIAL**: Implementation exists but incomplete relative to approved specification.
- **MATCHES**: Implementation perfectly matches the specification constants, units, tolerances, and logic.
- **CONFLICTS**: Implementation directly contradicts approved specification parameters or formulas.

### Key Audit Findings
1. **0% Unit Test Coverage**: There are currently **0 unit test files** targeting the valuation module in `src/lib/valuation/`. Vitest reports no test files found.
2. **Formula Gaps**: 4 major econometric models ($V_s$, Heckman Two-Stage Selection, Amihud Illiquidity Ratio $ILLIQ$, Weibull Hazard Function) described in `AGENTS.md` are **MISSING**.
3. **Decay Constant Conflict**: The comps noise filter in `src/lib/valuation/valuation.ts` uses a **180-day** exponential decay denominator (`exp(-ageDays / 180)`), whereas `AGENTS.md` mandates a **90-day** exponential time-decay weight (**CONFLICTS**).
4. **IAS 38 Accounting Gap**: `src/lib/valuation/scenario.ts` implements acquisition cost accounting but omits the exponential depreciation factor $A_v^t$ for D-Val ($D\text{-}Val = C_p \cdot A_v^t$) (**PARTIAL**).

Per FRM-003 strictures, **no code discrepancies are modified in this audit**. Each discrepancy is assigned a bounded follow-up issue (FRM-003-GAP-1 through FRM-003-GAP-7).

---

## 2. Specification Claim Audit & Coverage Mapping

### Claim 1: Integrated Value Score ($V_s$)
- **Spec Claim**:
  $$V_s = P_h \cdot (1 + r_{\text{excess}})^t \cdot C_i \cdot (1 + 0.15 \cdot H_z - 0.10 \cdot S_z) \cdot f(\text{Scarcity}) \cdot M$$
- **Status**: `MISSING`
- **Spec Parameters**:
  - $P_h$: Historical price base
  - $r_{\text{excess}}$: Excess rate of return
  - $t$: Time period
  - $C_i$: Comparable Index
  - $H_z$: Hot-hand z-score (multiplier $+0.15$)
  - $S_z$: Slump z-score (multiplier $-0.10$)
  - $f(\text{Scarcity})$: Scarcity adjustment function
  - $M$: Macroeconomic baseline index
- **TS Code Mapping**: `None`
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Spec defines $+0.15$ ($H_z$) and $-0.10$ ($S_z$). No matching constants exist in TS code.
  - **Units**: Spec uses currency units ($P_h$), time ($t$), non-dimensional z-scores ($H_z, S_z$), and index ratios ($C_i, M$).
  - **Tolerances & Rounding**: Unimplemented in TS codebase.
- **Bounded Follow-up Issue**: `FRM-003-GAP-1`: Implement Integrated Value Score $V_s$ formula with macroeconomic and player momentum parameters.

---

### Claim 2: Heckman Two-Stage Selection Model
- **Spec Claim**:
  Raw marketplace transaction feeds inherently suffer from selection and survivorship bias. System uses Heckman Probit selection model:
  - **Stage 1 (Selection Equation)**: Evaluates probability that an active listing will complete a cleared sale.
  - **Stage 2 (Outcome Equation)**: Calculates unbiased log-price using Inverse Mills Ratio ($\lambda$) to neutralize truncation bias.
- **Status**: `MISSING`
- **Spec Parameters**: Probit cumulative normal distribution, Inverse Mills Ratio ($\lambda$), log-price truncation bias correction.
- **TS Code Mapping**: `None`
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Probit parameters and Inverse Mills Ratio calculation missing.
  - **Units**: Log currency units for Stage 2 outcome equation.
  - **Tolerances & Rounding**: Unimplemented in TS codebase.
- **Bounded Follow-up Issue**: `FRM-003-GAP-2`: Implement Heckman Two-Stage Selection Model with Inverse Mills Ratio ($\lambda$) to correct marketplace selection bias.

---

### Claim 3: Amihud Illiquidity Ratio ($ILLIQ$)
- **Spec Claim**:
  $$ILLIQ_{iy} = \frac{1}{D_{iy}} \sum_{d=1}^{D_{iy}} \frac{|R_{iyd}|}{\text{VOLD}_{iyd}}$$
  Higher ratios indicate high sensitivity to single transaction shocks, triggering a larger volatility discount for ultra-rare cards.
- **Status**: `MISSING`
- **Spec Parameters**: Daily absolute price return $|R_{iyd}|$, daily dollar volume $\text{VOLD}_{iyd}$, active trading days $D_{iy}$, volatility discount trigger.
- **TS Code Mapping**: `None`
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Volatility discount scaling threshold parameters missing.
  - **Units**: Ratio of percentage price returns to dollar volume ($1 / \text{Currency Volume}$).
  - **Tolerances & Rounding**: Unimplemented in TS codebase.
- **Bounded Follow-up Issue**: `FRM-003-GAP-3`: Implement Amihud Illiquidity Ratio $ILLIQ$ and order-flow volatility discount for rare assets.

---

### Claim 4: Speculative Hazard and Survival Modeling (Weibull Hazard Function)
- **Spec Claim**:
  Asset bubble risk modeled using Weibull hazard function:
  $$h(t) = \lambda p (\lambda t)^{p-1}$$
  - $p > 1$: Player experiencing unsustainable hot streak (increasing price crash hazard).
  - $p = 1$: Stable blue-chip legend with memoryless, constant risk.
- **Status**: `MISSING`
- **Spec Parameters**: Weibull shape parameter $p$, scale parameter $\lambda$, asset speculative time $t$.
- **TS Code Mapping**: `None`
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Shape parameter boundary $p = 1.0$ missing.
  - **Units**: Hazard rate $h(t)$ in units of $1 / \text{time}$.
  - **Tolerances & Rounding**: Unimplemented in TS codebase.
- **Bounded Follow-up Issue**: `FRM-003-GAP-4`: Implement Weibull hazard function $h(t)$ for speculative bubble risk and athlete performance lifespans.

---

### Claim 5: Dual-Layer Accounting (IAS 38): D-Val & A-Val
- **Spec Claim**:
  - **D-Val (Auditable Cost Basis)**: $D\text{-}Val = C_p \cdot A_v^t$ representing physical capital outlay (purchase price + grading + shipping fees) constrained by depreciation rate $A_v^t$.
  - **A-Val (Commercial Valuation Index)**: Unconstrained market estimate derived from grading accuracy, provenance premiums, and dataset scarcity.
- **Status**: `PARTIAL`
- **Spec Parameters**: Capital outlay $C_p$, depreciation factor $A_v$, time $t$, separate D-Val and A-Val ledgers.
- **TS Code Mapping**:
  - **File**: `src/lib/valuation/scenario.ts`
  - **Function**: `calculateScenario`
  - **Implementation Detail**: `calculateScenario` computes total acquisition cost $C_p = \text{purchasePrice} + \sum \text{acquisitionCosts}$, expected gross sale price, net proceeds, and ROI. However, it lacks the exponential depreciation factor $A_v^t$ and explicit IAS 38 dual-ledger schema structure.
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Depreciation rate parameter $A_v$ is missing from TS cost basis calculation.
  - **Units**: Minor currency units (`bigint`).
  - **Tolerances & Rounding**: TS code uses `Decimal.ROUND_HALF_UP` / `ROUND_CEIL` for fee and ROI calculations, but D-Val depreciation exponent is missing.
- **Bounded Follow-up Issue**: `FRM-003-GAP-5`: Align cost basis accounting with IAS 38 D-Val depreciation formula $C_p \cdot A_v^t$ and explicit A-Val ledger.

---

### Claim 6: Comps Aggregator Noise Filter (Exponential Time-Decay Weight)
- **Spec Claim**:
  The Comps Aggregator pipeline automatically applies a 90-day exponential time-decay weight to sanitize the feed of emotional bidding wars, shill bidding, and Best Offer concealments.
- **Status**: `CONFLICTS`
- **Spec Parameters**: 90-day exponential time-decay scale constant.
- **TS Code Mapping**:
  - **File**: `src/lib/valuation/valuation.ts`
  - **Function**: `calculateFairValue`
  - **Implementation Detail**: `const recencyWeight = Math.exp(-comp.ageDays / 180);`
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Spec mandates a **90-day** time-decay factor. TS implementation uses a **180-day** decay denominator (`Math.exp(-comp.ageDays / 180)`).
  - **Units**: Days (`ageDays`).
  - **Tolerances & Rounding**: TS code calculates IEEE 754 floating-point exponential and rounds calculation tape inputs to 8 decimal places (`Number(c.recencyWeight.toFixed(8))`).
- **Bounded Follow-up Issue**: `FRM-003-GAP-6`: Resolve discrepancy between 90-day spec time-decay constant and 180-day implementation in fair value calculation.

---

### Claim 7: Behavioral Psychology: Favorite-Longshot Bias, FOMO and Overconfidence
- **Spec Claim**:
  System systematically accounts for Favorite-Longshot Bias (overpaying for high-variance unproven rookies vs safe Hall of Fame assets) and FOMO/overconfidence budget behavior during speculative frenzies.
- **Status**: `MISSING`
- **Spec Parameters**: Favorite-Longshot probability weighting function, FOMO price frenzy multiplier, Rookie variance penalty/premium.
- **TS Code Mapping**:
  - `src/lib/valuation/match-comp.ts`: `matchComp` contains a `rookie: 0.02` weight component for identity matching, but no pricing discount/premium model for behavioral biases exists.
- **Test Mapping**: `None` (0 test files)
- **Constants, Units, Tolerances & Rounding Comparison**:
  - **Constants**: Behavioral bias weighting factors missing.
  - **Units**: Non-dimensional adjustment factors.
  - **Tolerances & Rounding**: Unimplemented in TS codebase.
- **Bounded Follow-up Issue**: `FRM-003-GAP-7`: Implement Favorite-Longshot bias and FOMO/overconfidence behavioral pricing adjustments.

---

## 3. Audit of Existing TypeScript Valuation Functions

To ensure 100% complete coverage mapping, all existing functions in `src/lib/valuation/` have been audited and mapped below:

| Source File | Function Name | Spec Status | Test Mapping | Description / Formula in Code |
| :--- | :--- | :--- | :--- | :--- |
| `src/lib/valuation/valuation.ts` | `calculateFairValue` | `PARTIAL` | `None` (0 tests) | Calculates weighted percentile low (25th), center (50th), high (75th) with `weight = exp(-ageDays / 180) * match^2 * sourceQuality * verification`. |
| `src/lib/valuation/valuation.ts` | `calculateDealScore` | `UNKNOWN` | `None` (0 tests) | Calculates signed deal score: `clamp(round(((fair - current) / fair) / 0.04), -10, 10)`. Bounded [-10, +10]. |
| `src/lib/valuation/confidence.ts` | `calculateConfidence` | `UNKNOWN` | `None` (0 tests) | Calculates 6-component evidence confidence score (sample: 0.30, identity: 0.25, recency: 0.15, agreement: 0.15, liquidity: 0.10, sourceDiversity: 0.05) with 4 capping rules. |
| `src/lib/valuation/match-comp.ts` | `matchComp` | `UNKNOWN` | `None` (0 tests) | Weighted card comp attribute matching (14 factors) with hard exclusions and thresholds (`ELIGIBLE >= 0.90`, `MANUAL_REVIEW >= 0.75`). |
| `src/lib/valuation/auction.ts` | `projectAuctionClose` | `UNKNOWN` | `None` (0 tests) | Projects active auction hammer prices (25th, 50th, 75th quantiles) snapped to bid increments and computes projected all-in deal scores. |
| `src/lib/valuation/scenario.ts` | `calculateScenario` | `PARTIAL` | `None` (0 tests) | Calculates acquisition cost, selling fees, net proceeds, ROI, annualized ROI, break-even price, minimum sale price for target ROI, and max purchase price. |
| `src/lib/valuation/fees.ts` | `calculateMarketplaceFees` | `UNKNOWN` | `None` (0 tests) | Evaluates effective-dated fee schedules (basis points + flat fee per line item) against gross sale price. |
| `src/lib/valuation/fees.ts` | `selectFeeSchedule` | `UNKNOWN` | `None` (0 tests) | Selects active fee schedule for a source key at a target date. |
| `src/lib/valuation/exclusions.ts` | `detectListingExclusions` | `UNKNOWN` | `None` (0 tests) | Rule-based listing anomaly detection (lots, reprints, sealed boxes, breaks, cancelled transactions, unknown offer prices). |

---

## 4. Summary Matrix of Bounded Follow-Up Issues

| Issue Key | Target Spec Area | Summary of Discrepancy | Recommended Action |
| :--- | :--- | :--- | :--- |
| `FRM-003-GAP-1` | Section 2.A ($V_s$) | $V_s$ master formula missing from TS valuation engine. | Implement $V_s = P_h \cdot (1 + r_{\text{excess}})^t \cdot C_i \cdot (1 + 0.15 \cdot H_z - 0.10 \cdot S_z) \cdot f(\text{Scarcity}) \cdot M$. |
| `FRM-003-GAP-2` | Section 2.B (Heckman) | Heckman Probit selection equation and Inverse Mills Ratio $\lambda$ missing. | Implement Stage 1 Probit selection and Stage 2 outcome log-price model. |
| `FRM-003-GAP-3` | Section 2.C ($ILLIQ$) | Amihud Illiquidity Ratio formula missing. | Implement $ILLIQ_{iy} = \frac{1}{D_{iy}} \sum \frac{\|R_{iyd}\|}{\text{VOLD}_{iyd}}$ and volatility discount pipeline. |
| `FRM-003-GAP-4` | Section 2.D (Weibull) | Weibull hazard function $h(t) = \lambda p (\lambda t)^{p-1}$ missing. | Implement Weibull hazard risk calculator for bubble risk and athlete lifespans. |
| `FRM-003-GAP-5` | Section 2.E (IAS 38) | D-Val cost basis lacks depreciation factor $A_v^t$; dual ledgers missing. | Update D-Val formula to $C_p \cdot A_v^t$ and add formal D-Val/A-Val ledger schema. |
| `FRM-003-GAP-6` | Section 3 (Comps Decay) | TS code uses 180-day decay scale constant instead of 90-day spec. | Align recency weight formula to 90-day decay scale in `src/lib/valuation/valuation.ts`. |
| `FRM-003-GAP-7` | Section 3 (Behavioral) | Favorite-Longshot bias and FOMO budget frenzy models missing. | Implement behavioral probability weighting and speculative frenzy adjustments. |
| `FRM-003-GAP-8` | Unit Testing | 0% unit test coverage across all `src/lib/valuation/` functions. | Construct comprehensive Vitest unit test suites for all valuation modules. |

---

*Verified by Lead Quantitative Engineer (Jules) against `repair/mattsapp-test` base commit.*
