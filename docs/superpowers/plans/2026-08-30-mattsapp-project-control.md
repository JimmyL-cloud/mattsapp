# Mattsapp Project-Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish GitHub as the safe, auditable home base for mattsapp recovery, formula governance, multi-agent coordination, Vercel/Neon stabilization, and eventual release promotion.

**Architecture:** Project context lives in versioned repository documents while execution state lives in bounded GitHub issues. Universal and task-specific SOPs constrain every agent. All work branches from `repair/mattsapp-test`; `main` remains untouched until the final release gate.

**Tech Stack:** GitHub branches, pull requests, issues, labels, Markdown governance documents, Next.js/TypeScript repository, Vercel, Neon PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-08-30-mattsapp-recovery-project-control-design.md`

## Global Constraints

- Use `repair/mattsapp-test` as the recovery baseline.
- Never commit directly to `main`.
- Preserve recovered originals without editing or deleting them.
- Do not expose secret values in files, issues, logs, or pull requests.
- Do not change a formula without cited evidence, golden tests, and independent mathematical review.
- Keep every issue bounded to one independently reviewable deliverable.
- Require a draft pull request and completed handoff for agent-produced repository changes.
- Preserve the known-good `mattsapp-test` Vercel deployment until a replacement passes all release gates.
- Do not relink, delete, or consolidate Vercel or Neon resources during project-control setup.

---

## File Structure

### Project control

- `docs/recovery/MASTER-ROADMAP.md`: phase status, dependency order, task index, owners, and release gates.
- `docs/recovery/ASSET-INVENTORY.md`: manifest schema and summarized inventory of GitHub, NotebookLM, Drive, Vercel, Neon, and local recovery artifacts.
- `docs/recovery/DECISION-LOG.md`: owner-approved product, formula, and infrastructure decisions.

### Agent operations

- `docs/operations/AGENT-SOP.md`: universal rules for every agent.
- `docs/operations/FORMULA-CHANGE-SOP.md`: mathematical evidence and testing requirements.
- `docs/operations/RECOVERY-SOP.md`: immutable-original, hashing, duplicate, and promotion rules.
- `docs/operations/DEVELOPMENT-SOP.md`: issue-to-branch-to-PR lifecycle.
- `docs/operations/AGENT-HANDOFF-TEMPLATE.md`: mandatory completion report.

### Formula control

- `docs/valuation/FORMULA-SPEC.md`: canonical formula document scaffold with a strict approval state.
- `docs/valuation/FORMULA-SOURCE-MAP.md`: source identity, claim, evidence strength, and conflict mapping.
- `docs/valuation/IMPLEMENTATION-COVERAGE.md`: formula-to-TypeScript/test coverage matrix.

### GitHub templates

- `.github/ISSUE_TEMPLATE/recovery.yml`: recovery and inventory issue form.
- `.github/ISSUE_TEMPLATE/formula.yml`: formula analysis/change issue form.
- `.github/ISSUE_TEMPLATE/implementation.yml`: code and product issue form.
- `.github/PULL_REQUEST_TEMPLATE.md`: SOP acknowledgment, validation, formula impact, data/deployment impact, and handoff checklist.

---

### Task 1: Create the Master Roadmap and Decision Log

**Files:**
- Create: `docs/recovery/MASTER-ROADMAP.md`
- Create: `docs/recovery/DECISION-LOG.md`
- Reference: `docs/superpowers/specs/2026-08-30-mattsapp-recovery-project-control-design.md`

**Interfaces:**
- Consumes: approved design phases, owners, governance, and release gates.
- Produces: canonical phase/status model and stable decision identifiers used by issues, SOPs, and PRs.

- [ ] **Step 1: Create the roadmap heading and state block**

Include repository, baseline branch, protected branch, project-control branch, current phase, last-updated date, and named project owner.

- [ ] **Step 2: Add all six phases with entry and exit gates**

Copy the approved Phase 0 through Phase 5 goals and deliverables. Give each phase one of: `NOT STARTED`, `ACTIVE`, `BLOCKED`, or `COMPLETE`. Mark Phase 0 `ACTIVE`; mark all later phases `NOT STARTED`.

- [ ] **Step 3: Add the dependency-ordered work queue**

Create task identifiers:
- `REC-001` source and artifact inventory
- `REC-002` checksums and duplicate mapping
- `REC-003` durable Drive exports
- `OPS-001` agent SOP system
- `AUD-001` existing valuation implementation audit
- `FRM-001` canonical source map
- `FRM-002` formula specification
- `FRM-003` implementation coverage matrix
- `VAL-001` typed valuation contract
- `VAL-002` golden fixtures
- `VAL-003` deterministic valuation pipeline
- `VAL-004` calculation tape
- `INF-001` Vercel inventory and failure diagnosis
- `INF-002` Neon inventory and backup
- `INF-003` environment parity map
- `UI-001` terminal information architecture
- `REL-001` recovery release gate

For each identifier record phase, dependency identifiers, recommended owner, status, and GitHub issue link field initialized to `Not created`.

- [ ] **Step 4: Create the decision log**

Use columns: decision ID, date, status, scope, decision, rationale, evidence, approver, affected tasks. Record:
- `DEC-001`: GitHub is the home base.
- `DEC-002`: `repair/mattsapp-test` is the working recovery baseline.
- `DEC-003`: `main` remains untouched until the final release gate.
- `DEC-004`: formula work is priority one.
- `DEC-005`: NotebookLM/Drive formula research is evidence; the approved formula spec becomes canonical.
- `DEC-006`: the product interface is Bloomberg-terminal-inspired and subordinate to verified valuation outputs.
- `DEC-007`: preserve both Vercel projects until consolidation is proven.

- [ ] **Step 5: Validate internal links and status vocabulary**

Confirm every task identifier appears once in the roadmap queue and every decision uses an allowed status: `PROPOSED`, `APPROVED`, `SUPERSEDED`.

- [ ] **Step 6: Commit**

Commit message: `docs: add recovery roadmap and decision log`.

---

### Task 2: Create the Agent SOP System

**Files:**
- Create: `docs/operations/AGENT-SOP.md`
- Create: `docs/operations/FORMULA-CHANGE-SOP.md`
- Create: `docs/operations/RECOVERY-SOP.md`
- Create: `docs/operations/DEVELOPMENT-SOP.md`
- Create: `docs/operations/AGENT-HANDOFF-TEMPLATE.md`
- Modify: `docs/recovery/MASTER-ROADMAP.md`

**Interfaces:**
- Consumes: design authority hierarchy, branch rules, task identifiers, decision identifiers.
- Produces: mandatory operating contracts linked by every future issue and PR.

- [ ] **Step 1: Write the universal AGENT-SOP**

Include mandatory reading order, authority hierarchy, allowed and prohibited actions, branch rules, secret handling, scope control, evidence rules, testing obligations, draft-PR requirement, and stop conditions.

Stop conditions must include:
- formula ambiguity;
- request to touch `main`;
- missing credentials or external authority;
- destructive cleanup;
- database/environment identity uncertainty;
- conflict with an approved decision.

- [ ] **Step 2: Write FORMULA-CHANGE-SOP**

Require source identity, exact claim, symbol table, units, ranges, assumptions, constants, tolerances, missing-data behavior, boundary behavior, golden fixtures, calculation-tape changes, and independent Hermes or equivalent mathematical review.

Define formula states: `RESEARCH`, `PROPOSED`, `REVIEWED`, `APPROVED`, `IMPLEMENTED`, `VERIFIED`.

- [ ] **Step 3: Write RECOVERY-SOP**

Define immutable originals, SHA-256 hashing, origin metadata, duplicate groups, canonical-copy selection, promotion status, durable export formats, and prohibition on deleting uncertain material.

Use promotion states: `ORIGINAL`, `DUPLICATE`, `PROTOTYPE`, `NORMALIZED`, `PROMOTED`, `REJECTED`.

- [ ] **Step 4: Write DEVELOPMENT-SOP**

Define lifecycle: issue assignment, branch creation from approved base, failing test where behavior changes, minimal implementation, validation, self-review, draft PR, code review, merge authorization, handoff.

Require exact command output summaries for `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, and `pnpm run build` when applicable.

- [ ] **Step 5: Write the handoff template**

Include issue, branch, base SHA, head SHA, files changed, assumptions, decisions, tests, results, formula impact, data impact, Vercel/Neon impact, risks, rollback, and recommended next task.

- [ ] **Step 6: Link SOPs from the roadmap**

Add an `Agent Entry Point` section linking all five documents and state that an issue cannot begin until its required SOPs are read.

- [ ] **Step 7: Validate terminology**

Confirm branch names, formula states, promotion states, and decision statuses match their defining documents.

- [ ] **Step 8: Commit**

Commit message: `docs: add agent operating procedures`.

---

### Task 3: Create the Recovery Asset Inventory

**Files:**
- Create: `docs/recovery/ASSET-INVENTORY.md`
- Modify: `docs/recovery/MASTER-ROADMAP.md`

**Interfaces:**
- Consumes: local `recovery/notebooklm` metadata; GitHub branch/commit metadata; Google Drive IDs; Vercel project/deployment metadata; Neon identity to be supplied by `INF-002`.
- Produces: unique asset IDs and duplicate groups referenced by formula source mapping.

- [ ] **Step 1: Define the inventory schema**

Use fields: asset ID, title, source system, source ID/URL, retrieved time, format, size, SHA-256, duplicate group, canonical candidate, sensitivity, promotion state, local path, notes.

- [ ] **Step 2: Inventory local NotebookLM artifacts**

Record every original file in `recovery/notebooklm`. Exclude generated `.pyc` files from canonical candidates and mark exact duplicate images/documents as `DUPLICATE`.

- [ ] **Step 3: Inventory Google Drive formula material**

Record stable Drive IDs rather than filenames alone. Include the `Sports Card Market Analysis`, `mattsappFORMULA`, and `Market Analytics & Business Intelligence` folders and the priority formula documents identified in the design review.

- [ ] **Step 4: Inventory GitHub recovery state**

Record repository ID, visibility, branches, current SHAs, open PR, and the relationship between `main`, `repair/mattsapp-test`, and `recovery/project-control`.

- [ ] **Step 5: Inventory Vercel state**

Record team, the `mattsapp` and `mattsapp-test` project IDs, domains, latest deployment IDs/states, linked Git repository, and known branch/deployment relationships. Record environment-variable names only.

- [ ] **Step 6: Add the Neon inventory placeholder as a blocked record**

Record `INF-002` as the dependency. Do not invent organization, project, branch, role, or database identifiers.

- [ ] **Step 7: Update roadmap statuses**

Mark `REC-001` complete only when all known systems are represented. Keep `REC-002` active until hashes and duplicate groups are complete. Keep `INF-002` not started or blocked according to credential availability.

- [ ] **Step 8: Commit**

Commit message: `docs: inventory recovered project assets`.

---

### Task 4: Create GitHub Issue and Pull Request Templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/recovery.yml`
- Create: `.github/ISSUE_TEMPLATE/formula.yml`
- Create: `.github/ISSUE_TEMPLATE/implementation.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `docs/operations/DEVELOPMENT-SOP.md`

**Interfaces:**
- Consumes: issue model and handoff requirements.
- Produces: enforceable task intake and review forms.

- [ ] **Step 1: Create the recovery issue form**

Require phase, asset/source system, objective, immutable originals, deliverables, acceptance criteria, dependencies, sensitivity, and required evidence.

- [ ] **Step 2: Create the formula issue form**

Require formula state, source citations, affected symbols, units, current behavior, proposed behavior, golden fixtures, tolerance, math reviewer, implementation owner, and explicit non-goals.

- [ ] **Step 3: Create the implementation issue form**

Require objective, base branch, dependencies, files/components, acceptance criteria, required tests, formula impact, data impact, deployment impact, and handoff.

- [ ] **Step 4: Create the PR template**

Require linked issue, SOP acknowledgment, branch/base confirmation, summary, files, tests/results, formula impact, data/migration impact, Vercel/Neon impact, security considerations, screenshots only when UI changes, rollback, and completed handoff.

- [ ] **Step 5: Validate YAML syntax and template paths**

Parse all three YAML files and confirm GitHub recognizes `.github/ISSUE_TEMPLATE`.

- [ ] **Step 6: Update DEVELOPMENT-SOP**

Link each issue type to the correct template and require the PR template.

- [ ] **Step 7: Commit**

Commit message: `chore: add project-control issue and PR templates`.

---

### Task 5: Create Formula-Control Scaffolds

**Files:**
- Create: `docs/valuation/FORMULA-SPEC.md`
- Create: `docs/valuation/FORMULA-SOURCE-MAP.md`
- Create: `docs/valuation/IMPLEMENTATION-COVERAGE.md`
- Modify: `docs/recovery/MASTER-ROADMAP.md`

**Interfaces:**
- Consumes: asset IDs, formula SOP states, valuation audit output.
- Produces: structured destinations for `FRM-001`, `FRM-002`, and `FRM-003`; does not approve any formula.

- [ ] **Step 1: Create FORMULA-SPEC with status RESEARCH**

Include sections for version, approval state, scope, symbol table, input contract, output contract, ordered pipeline, comp qualification, exclusions, weighting/time decay, manipulation adjustments, valuation, confidence, scenarios, fees, decision score, calculation tape, missing data, rounding/tolerances, golden fixtures, conflicts, and approvals.

State clearly that no formula is canonical until the document reaches `APPROVED`.

- [ ] **Step 2: Create FORMULA-SOURCE-MAP**

Use columns: claim ID, pipeline stage, claim, source asset ID, source location, evidence type, evidence strength, conflicts, review state, notes.

- [ ] **Step 3: Create IMPLEMENTATION-COVERAGE**

Use columns: formula claim ID, expected behavior, TypeScript file/function, test file/test name, coverage state, discrepancy, issue.

Coverage states: `UNKNOWN`, `MISSING`, `PARTIAL`, `MATCHES`, `CONFLICTS`.

- [ ] **Step 4: Link phase tasks**

Link `FRM-001`, `FRM-002`, `FRM-003`, `AUD-001`, and `VAL-002` across the three documents and roadmap.

- [ ] **Step 5: Validate that scaffolds contain no invented formula values**

Search for unapproved numeric constants and ensure examples are structural rather than claims.

- [ ] **Step 6: Commit**

Commit message: `docs: scaffold formula governance documents`.

---

### Task 6: Create Labels and the Initial GitHub Issue Queue

**Files:**
- Modify: `docs/recovery/MASTER-ROADMAP.md`
- Modify: `docs/recovery/DECISION-LOG.md`

**Interfaces:**
- Consumes: roadmap task identifiers, templates, SOPs, ownership model.
- Produces: assignable GitHub issues and stable issue links.

- [ ] **Step 1: Create priority and workflow labels**

Create:
- `P0-formula`
- `P1-recovery`
- `P2-infrastructure`
- `P3-product`
- `P4-ui`
- `blocked`
- `needs-math-review`
- `needs-code-review`

- [ ] **Step 2: Create owner-routing labels**

Create:
- `Jules`
- `Hermes`
- `Codex`
- `Jimmy`

Owner labels indicate recommended routing, not GitHub account assignment.

- [ ] **Step 3: Create the Phase 0 and Phase 1 issues**

Create bounded issues for:
- `REC-001`
- `REC-002`
- `REC-003`
- `OPS-001`
- `AUD-001`
- `FRM-001`
- `FRM-002`
- `FRM-003`
- `INF-001`
- `INF-002`
- `INF-003`

Each issue must link the roadmap, universal SOP, task-specific SOP, dependencies, deliverables, acceptance criteria, and handoff template.

- [ ] **Step 4: Route initial work**

Recommend:
- Jules: `AUD-001`
- Hermes: mathematical review portion of `FRM-001` after source mapping exists
- Codex: `REC-001`, `REC-002`, `OPS-001`, `FRM-001`, `INF-001`
- Jimmy: approvals and credential-controlled portions of `REC-003` and `INF-002`

Do not start dependent issues prematurely.

- [ ] **Step 5: Update roadmap links**

Replace `Not created` with exact issue links and set statuses based on actual assignment.

- [ ] **Step 6: Commit roadmap updates**

Commit message: `docs: link initial recovery issue queue`.

---

### Task 7: Open and Validate the Project-Control Pull Request

**Files:**
- Review all files created or modified in Tasks 1 through 6.
- Do not modify application behavior.

**Interfaces:**
- Consumes: completed control documents, templates, labels, and issue queue.
- Produces: one reviewable project-control PR targeting `repair/mattsapp-test`.

- [ ] **Step 1: Run document validation**

Check:
- no `TBD` or ambiguous placeholders;
- all relative Markdown links resolve;
- all YAML templates parse;
- every active issue links required SOPs;
- every roadmap task has a unique identifier;
- no secret values appear;
- no application source files changed;
- `main` is not the PR base.

- [ ] **Step 2: Review Git diff**

Confirm the diff contains only project-control documents and GitHub templates.

- [ ] **Step 3: Open a draft PR**

Base: `repair/mattsapp-test`  
Head: `recovery/project-control`  
Title: `Establish mattsapp recovery project control`

The PR body must summarize governance, SOPs, roadmap, issue queue, formula controls, Vercel/Neon work, validation, and explicitly state that `main` is untouched.

- [ ] **Step 4: Complete the handoff**

Use `docs/operations/AGENT-HANDOFF-TEMPLATE.md`. Record the project-control commit range and list owner decisions still required.

- [ ] **Step 5: Request owner review**

Do not merge until Jimmy approves the project-control PR.
