# Mattsapp Decision Log

Statuses: `PROPOSED`, `APPROVED`, `SUPERSEDED`.

| ID | Date | Status | Scope | Decision | Rationale | Evidence | Approver | Affected tasks |
|---|---|---:|---|---|---|---|---|---|
| DEC-001 | 2026-08-30 | APPROVED | Operations | GitHub is the project home base. | Versioned context, issues, branches, reviews, and agent handoffs must live together. | Owner discussion and approved project-control design | Jimmy | All |
| DEC-002 | 2026-08-30 | APPROVED | Recovery | `repair/mattsapp-test` is the working recovery baseline. | It contains the strongest recovered implementation and known successful deployment lineage. | GitHub PR #1, branch comparison, Vercel READY deployments | Jimmy | All repository work |
| DEC-003 | 2026-08-30 | APPROVED | Branching | `main` remains untouched until the final release gate. | The recovered stable branch must not be risked during reconstruction. | Owner approval | Jimmy | OPS-001, REL-001 |
| DEC-004 | 2026-08-30 | APPROVED | Product | A working card valuation function is priority one. | The formula is the core product; other application work supports it. | Owner direction | Jimmy | FRM-001 through VAL-004 |
| DEC-005 | 2026-08-30 | APPROVED | Formula | NotebookLM and Drive research are evidence; the reviewed formula specification becomes canonical. | Generated research must be preserved while contradictions and implementation gaps are resolved explicitly. | NotebookLM/Drive inventory and owner direction | Jimmy | REC-001 through FRM-003 |
| DEC-006 | 2026-08-30 | APPROVED | UI | The product interface is Bloomberg-terminal-inspired and subordinate to verified valuation outputs. | Dense, fast, auditable information display serves the valuation workflow. | Owner direction | UI-001 |
| DEC-007 | 2026-08-30 | APPROVED | Infrastructure | Preserve both Vercel projects until consolidation is proven. | `mattsapp-test` is known-good while `mattsapp` currently fails production builds. | Vercel project/deployment inventory | Jimmy | INF-001, REL-001 |

## Decision Rules

- New decisions receive the next sequential identifier.
- Changes never rewrite history; they add a new decision and mark the old one `SUPERSEDED`.
- Formula-policy decisions must link their formula claim IDs and review evidence.
- Infrastructure decisions must name resources by stable project or deployment ID without recording secret values.
