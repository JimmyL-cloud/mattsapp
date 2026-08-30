# Mattsapp Formula Implementation Coverage

**Tasks:** AUD-001, FRM-003  
**State:** UNKNOWN until repository audit and formula approval

## Coverage States

- `UNKNOWN`
- `MISSING`
- `PARTIAL`
- `MATCHES`
- `CONFLICTS`

## Coverage Matrix

| Formula claim ID | Expected behavior | TypeScript file and function | Test file and test name | Coverage state | Discrepancy | Issue |
|---|---|---|---|---|---|---|

## Audit Scope

- `src/lib/valuation/`
- `src/features/analysis/`
- related database schemas and repositories
- API routes that accept or persist valuation inputs/outputs
- tests for valuation, confidence, scenarios, fees, auctions, exclusions, matching, imports, portfolio, and performance

## Audit Rules

- Record current behavior; do not repair it during AUD-001.
- Cite exact file paths, function names, and line numbers.
- Extract every constant, threshold, default, and rounding point.
- Distinguish duplicated formula logic from presentation formatting.
- Link discrepancies to approved claim IDs only after FRM-002.
- UI components must not become formula authorities.

## Verification Gate

A claim reaches `MATCHES` only when approved behavior, implementation, tests, units, tolerances, and calculation-tape output agree.
