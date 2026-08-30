# Mattsapp Formula Specification

**Formula state:** RESEARCH  
**Canonical version:** Unassigned  
**Approval:** Not approved for production behavior  
**Dependencies:** FRM-001, FRM-002, AUD-001

No formula in this document is canonical until the document reaches `APPROVED` under `FORMULA-CHANGE-SOP.md`.

## Scope

Define the deterministic, explainable valuation pipeline from source evidence to decision score and calculation tape.

## Symbol Table

| Claim ID | Symbol | Meaning | Unit | Valid range | Source asset | State |
|---|---|---|---|---|---|---|

## Input Contract

Document identity, card attributes, grade/condition, provenance, market records, acquisition/exit assumptions, temporal context, and user policy inputs.

## Output Contract

Document point valuation, valuation range, confidence, scenarios, costs, expected return, decision score, formula version, evidence trace, warnings, and calculation tape.

## Ordered Pipeline

1. Source evidence ingestion
2. Comp qualification
3. Exclusions and quarantine
4. Weighting and time decay
5. Market and manipulation adjustments
6. Valuation
7. Confidence
8. Scenarios
9. Fees and expected return
10. Decision score
11. Calculation tape

## Comp Qualification

Claims are added through FRM-001 and cannot be approved without source IDs, units, boundaries, and tests.

## Exclusions

Define invalid, mismatched, unpaid, manipulated, duplicate, stale, and unsupported observations with explicit reason codes.

## Weighting and Time Decay

Define weighting only after decay model, time unit, half-life or coefficient, normalization, and sparse-data behavior are reviewed.

## Market and Manipulation Adjustments

Separate observed evidence, flags, exclusions, and numerical adjustments. Do not convert a detection flag into a price adjustment without an approved claim.

## Valuation

Document estimator, transformations, normalization, scarcity/condition/provenance adjustments, and range construction.

## Confidence

Define confidence semantics independently from point valuation. Confidence must not imply statistical coverage unless the approved model supports that claim.

## Scenarios

Define downside, base, and upside inputs and outputs without duplicating the core valuation engine.

## Fees and Expected Return

Define acquisition, grading, shipping, marketplace, payment, tax-policy, holding, and exit costs with units and timing.

## Decision Score

Define score purpose, inputs, bounds, monotonicity, thresholds, and product interpretation.

## Calculation Tape

Each step records claim ID, formula version, inputs, intermediate value, output, units, rounding, evidence IDs, warnings, and exclusion reasons.

## Missing Data and Invalid Inputs

Each claim specifies required/optional inputs, fallback prohibition or policy, user-visible warning, and effect on confidence.

## Rounding and Numerical Tolerances

Rounding occurs at approved presentation or accounting boundaries, not silently during intermediate arithmetic. Each tolerance is justified per claim.

## Golden Fixtures

| Fixture ID | Purpose | Inputs | Expected outputs | Tolerance | Claim IDs | Review |
|---|---|---|---|---|---|---|

## Conflicts and Owner Decisions

| Conflict ID | Claim IDs | Sources | Conflict | Recommendation | Decision ID | Status |
|---|---|---|---|---|---|---|

## Approvals

| Role | Reviewer | Evidence | Date | State |
|---|---|---|---|---|
