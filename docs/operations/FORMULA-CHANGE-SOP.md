# Mattsapp Formula Change SOP

## Formula States

`RESEARCH -> PROPOSED -> REVIEWED -> APPROVED -> IMPLEMENTED -> VERIFIED`

A formula cannot skip a state. Only owner-approved review can move a claim to `APPROVED`.

## Required Formula Record

Every formula claim must include:

- stable claim ID;
- pipeline stage;
- exact source asset ID and source location;
- verbatim mathematical expression where available;
- symbol definitions;
- input and output units;
- valid ranges and domain restrictions;
- constants, thresholds, and defaults;
- assumptions and evidence strength;
- rounding and numerical tolerance;
- missing-data behavior;
- boundary and invalid-input behavior;
- conflicts with other sources;
- calculation-tape representation;
- independent math reviewer;
- owner decision when product policy is involved.

## Change Process

1. Record the source in `FORMULA-SOURCE-MAP.md`.
2. Set the claim to `RESEARCH` or `PROPOSED`.
3. Compare with current TypeScript behavior and tests.
4. Construct hand-checkable golden fixtures.
5. Request independent dimensional, bounds, and numerical review.
6. Resolve conflicts through the decision log.
7. Obtain owner approval.
8. Implement through a separate issue using failing tests first.
9. Verify golden fixtures, invariants, boundaries, missing data, and calculation tape.
10. Set `VERIFIED` only after implementation and review agree.

## Mandatory Test Evidence

- exact expected values for representative fixtures;
- tolerance justified by arithmetic and units;
- monotonicity or other invariants where mathematically required;
- zero, negative, extreme, sparse, and missing-input cases;
- raw/included/excluded comp trace;
- deterministic replay using the same formula version.

## Forbidden Shortcuts

- selecting constants because outputs look plausible;
- copying prototype behavior without source review;
- replacing a specified model with a simpler heuristic;
- embedding formula logic in UI components;
- updating snapshots without explaining numerical change;
- calling a generated report or chat response canonical.
