# Mattsapp Master Roadmap

**Repository:** `JimmyL-cloud/mattsapp`  
**Project owner:** Jimmy  
**Recovery baseline:** `repair/mattsapp-test`  
**Protected stable branch:** `main`  
**Project-control branch:** `recovery/project-control`  
**Current phase:** Phase 0 — Preserve and organize  
**Last updated:** 2026-08-30

## Mission

Deliver a trustworthy, reproducible, explainable sports-card valuation function and expose it through a dense Bloomberg-terminal-inspired product. Formula research is priority one. GitHub is the operational home base.

## Status Vocabulary

- `NOT STARTED`
- `ACTIVE`
- `BLOCKED`
- `COMPLETE`

## Phase Status

| Phase | Goal | Status | Exit gate |
|---|---|---:|---|
| 0 — Preserve and organize | Make every unique asset, configuration, and data store recoverable | ACTIVE | Inventory, durable exports, SOPs, templates, initial issues, Vercel identity, and Neon identity recorded |
| 1 — Establish the formula bible | Produce one cited and reviewable mathematical specification | NOT STARTED | Formula spec approved; source map and implementation coverage reviewed |
| 2 — Trustworthy valuation function | Produce deterministic valuation with golden fixtures and calculation tape | NOT STARTED | Formula implementation verified against approved fixtures and invariants |
| 3 — Secure data and persistence | Make valuation data reproducible and infrastructure recoverable | NOT STARTED | Neon restore proven; migrations, auth, provenance, and environment parity verified |
| 4 — Terminal product | Expose verified outputs through a dense keyboard-first interface | NOT STARTED | Primary workflows verified without formula duplication in the UI |
| 5 — Consolidate and release | Promote one verified system to stable production | NOT STARTED | All release gates pass and reviewed recovery PR is approved for `main` |

## Dependency-Ordered Work Queue

| ID | Phase | Objective | Dependencies | Recommended owner | Status | Issue |
|---|---:|---|---|---|---:|---|
| REC-001 | 0 | Inventory NotebookLM, Drive, GitHub, Vercel, Neon, and local artifacts | None | Codex | ACTIVE | Not created |
| REC-002 | 0 | Compute hashes and map duplicate groups | REC-001 | Codex | NOT STARTED | Not created |
| REC-003 | 0 | Export Google-native originals into durable formats | REC-001 | Jimmy + Codex | NOT STARTED | Not created |
| OPS-001 | 0 | Establish agent SOPs, templates, and handoff rules | None | Codex | ACTIVE | Not created |
| AUD-001 | 1 | Audit the existing TypeScript valuation implementation | OPS-001 | Jules | NOT STARTED | Not created |
| FRM-001 | 1 | Build the canonical formula source map | REC-001, REC-002 | Codex + Hermes | NOT STARTED | Not created |
| FRM-002 | 1 | Write and review the canonical formula specification | FRM-001, AUD-001 | Codex + Hermes + Jimmy | NOT STARTED | Not created |
| FRM-003 | 1 | Map approved formulas to TypeScript and tests | FRM-002, AUD-001 | Jules + Codex | NOT STARTED | Not created |
| VAL-001 | 2 | Define the typed valuation input/output contract | FRM-002 | Codex | NOT STARTED | Not created |
| VAL-002 | 2 | Create approved golden valuation fixtures | FRM-002, VAL-001 | Hermes + Codex | NOT STARTED | Not created |
| VAL-003 | 2 | Implement the deterministic valuation pipeline | VAL-001, VAL-002, FRM-003 | Codex/Jules | NOT STARTED | Not created |
| VAL-004 | 2 | Implement replayable calculation tape | VAL-003 | Codex/Jules | NOT STARTED | Not created |
| INF-001 | 0/3 | Inventory Vercel and diagnose failing production deployments | OPS-001 | Codex | NOT STARTED | Not created |
| INF-002 | 0/3 | Identify Neon resources and create a verified backup/restore path | OPS-001, owner access | Jimmy + Codex | NOT STARTED | Not created |
| INF-003 | 3 | Map development, preview, and production environments | INF-001, INF-002 | Codex | NOT STARTED | Not created |
| UI-001 | 4 | Define terminal information architecture | VAL-001, VAL-004 | Codex + Jimmy | NOT STARTED | Not created |
| REL-001 | 5 | Execute recovery release gate and promotion review | All phase exit gates | Codex + Jimmy | NOT STARTED | Not created |

## Formula Gate

No formula may reach production unless it has:

1. a stable claim/source identifier;
2. defined symbols, units, ranges, and assumptions;
3. explicit constants and tolerances;
4. missing-data and boundary behavior;
5. golden fixtures and regression tests;
6. calculation-tape representation;
7. independent mathematical review;
8. owner approval where product policy is involved.

## Release Gate

Promotion to `main` requires:

- approved formula specification;
- passing typecheck, lint, unit, integration, regression, end-to-end, and production build checks;
- migration and database restore verification;
- authentication and security review;
- READY Vercel preview with acceptable runtime logs;
- owner acceptance of representative valuation fixtures;
- reviewed release PR from the validated recovery line.

## Agent Entry Point

Until the SOP files in OPS-001 are merged, agents must follow the approved project-control design and their issue acceptance criteria. Once available, every agent reads:

- `docs/operations/AGENT-SOP.md`
- the issue-specific SOP;
- `docs/operations/AGENT-HANDOFF-TEMPLATE.md`

An issue cannot begin until required SOPs are read.

## Current Safe Operating Position

- Preserve `mattsapp-test` as the known-good Vercel deployment.
- Do not consolidate Vercel or Neon yet.
- Do not target `main`.
- Do not alter formulas while recovery evidence is still being normalized.
