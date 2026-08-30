# Mattsapp Recovery and Project-Control Design

**Date:** 2026-08-30
**Status:** Draft for owner review
**Repository:** `JimmyL-cloud/mattsapp`
**Working baseline:** `repair/mattsapp-test`
**Project-control branch:** `recovery/project-control`

## 1. Purpose

Mattsapp is a sports-card valuation and decision-support application whose primary product is a trustworthy, explainable valuation function. The formula research preserved in NotebookLM and Google Drive is the product specification. The application shell, persistence, deployment, and Bloomberg-terminal-inspired interface support that formula but may not silently redefine it.

This design establishes GitHub as the operational home base for recovery, mathematical governance, implementation, agent coordination, infrastructure stabilization, and release promotion.

## 2. Current State

- The GitHub repository is private and has two material branches: `main` and `repair/mattsapp-test`.
- `repair/mattsapp-test` contains the strongest recovered implementation and is the base for recovery work.
- `main` contains a later `AGENTS.md` commit and currently produces failing Vercel deployments. It is not the development baseline.
- Vercel has two projects linked to the repository:
  - `mattsapp-test`, with a known READY production deployment.
  - `mattsapp`, whose latest production deployment is ERROR.
- The application uses PostgreSQL through Neon, configured through `DATABASE_URL`.
- NotebookLM contains 68 research sources and 32 visible Studio artifacts.
- Google Drive contains original formula research, reports, source PDFs, NotebookLM exports, and duplicates.
- Recovered local artifacts are evidence. They are not production code until reviewed and promoted.

## 3. Authority Hierarchy

When sources disagree, use this order:

1. Owner decisions recorded in GitHub.
2. Canonical formula specification approved through formula review.
3. Original NotebookLM and Google Drive research evidence.
4. Golden fixtures and reviewed regression tests.
5. Verified behavior on the recovery baseline.
6. Generated prototypes, summaries, and agent recommendations.
7. Unverified claims in chats, generated reports, or standalone instruction files.

No agent may treat a generated claim as implemented truth merely because it sounds authoritative.

## 4. Branch and Change Governance

- `main` remains untouched until the recovery baseline passes all promotion gates.
- Recovery and project-control work branches from `repair/mattsapp-test`.
- Each issue receives one narrowly scoped branch.
- Every change is submitted through a pull request.
- Formula changes require mathematical review and executable regression evidence.
- Infrastructure work must not expose credentials or secret values.
- Recovered or uncertain files are preserved; deletion requires an explicit owner-approved cleanup task.
- Promotion to `main` occurs once, through a reviewed release PR, after formula, application, database, and deployment gates pass.

Recommended branch patterns:

- `recovery/<scope>`
- `formula/<scope>`
- `audit/<scope>`
- `infra/<scope>`
- `feature/<scope>`
- `ui/<scope>`

## 5. Repository Control Documents

The project-control implementation will create:

- `docs/recovery/MASTER-ROADMAP.md`
- `docs/recovery/ASSET-INVENTORY.md`
- `docs/recovery/DECISION-LOG.md`
- `docs/operations/AGENT-SOP.md`
- `docs/operations/FORMULA-CHANGE-SOP.md`
- `docs/operations/RECOVERY-SOP.md`
- `docs/operations/DEVELOPMENT-SOP.md`
- `docs/operations/AGENT-HANDOFF-TEMPLATE.md`
- `docs/valuation/FORMULA-SPEC.md`
- `docs/valuation/FORMULA-SOURCE-MAP.md`
- `docs/valuation/IMPLEMENTATION-COVERAGE.md`

The roadmap explains project state and task order. GitHub issues are the executable work queue. Documents provide context; issues provide ownership and status.

## 6. Agent Standard Operating Procedures

### Universal requirements

Before starting, every agent must:

1. Read the issue, `MASTER-ROADMAP.md`, and `AGENT-SOP.md`.
2. Read the task-specific SOP named in the issue.
3. Confirm the base branch and avoid `main`.
4. State assumptions in the PR rather than silently resolving ambiguity.
5. Keep changes within the issue acceptance criteria.
6. Run the required validation commands.
7. submit a draft PR and complete the handoff template.

### Formula restrictions

Agents may identify discrepancies but may not silently improve, simplify, tune, or replace formulas. A formula change must document:

- source and citation;
- symbol definitions;
- units and valid ranges;
- constants and thresholds;
- assumptions;
- rounding and numerical tolerance;
- missing-data behavior;
- boundary behavior;
- golden fixtures;
- calculation-tape implications;
- independent mathematical review.

### Recovery restrictions

Original artifacts are immutable evidence. Copies may be normalized only in promoted documentation directories. Each recovered artifact records origin, retrieval date, content hash, format, duplicate relationship, and promotion status.

### Handoff requirements

Every agent handoff includes:

- issue and branch;
- files changed;
- decisions and assumptions;
- validation commands and results;
- unresolved risks;
- formula impact;
- database or deployment impact;
- recommended next task.

## 7. GitHub Issue Model

Each issue contains:

- priority and phase;
- objective;
- owner;
- dependencies;
- source documents;
- exact scope;
- out-of-scope actions;
- deliverables;
- acceptance criteria;
- required tests or evidence;
- handoff requirements.

Labels:

- `P0-formula`
- `P1-recovery`
- `P2-infrastructure`
- `P3-product`
- `P4-ui`
- `blocked`
- `needs-math-review`
- `needs-code-review`
- `Jules`
- `Hermes`
- `Codex`
- `Jimmy`

## 8. Priority Phases

### Phase 0: Preserve and organize

Goal: ensure no unique evidence, code, configuration, or data can be lost.

Deliverables:

- checksummed NotebookLM, Drive, GitHub, Vercel, and Neon inventories;
- deduplicated manifest that preserves all originals;
- exported Google-native documents in durable local formats;
- GitHub roadmap, SOPs, labels, templates, and issue queue;
- documented Vercel projects, deployments, domains, build settings, and environment-variable names;
- verified Neon ownership, project identity, branch identity, backup path, and restore procedure.

No application behavior or formula changes occur in this phase.

### Phase 1: Establish the formula bible

Goal: create one reviewable mathematical specification.

Deliverables:

- canonical symbol table;
- input and output contracts;
- formula sequence and dependencies;
- units, ranges, constants, thresholds, decay rules, exclusions, confidence rules, fees, scenarios, and decision-score semantics;
- source citations and evidence strength;
- duplicate and conflicting-claim register;
- formula-to-TypeScript coverage matrix;
- unresolved-policy decisions assigned to the owner.

Jules audits existing code. Hermes performs independent mathematical review. Codex reconciles evidence and implementation. Jimmy decides product policy where evidence does not dictate one answer.

### Phase 2: Deliver one trustworthy valuation function

Goal: produce a deterministic, explainable, tested valuation pipeline.

Required flow:

`source evidence -> comp qualification -> exclusions -> weighting and time decay -> market/manipulation adjustments -> valuation -> confidence -> scenarios -> fees and expected return -> decision score -> calculation tape`

Deliverables:

- stable typed input/output interfaces;
- deterministic valuation orchestration;
- raw, included, and excluded comp evidence;
- golden fixtures;
- invariant, boundary, missing-data, and numerical-stability tests;
- replayable calculation tape;
- explicit version identifier for formula behavior.

UI expansion is blocked until this phase passes.

### Phase 3: Secure data and persistence

Goal: make valuations reproducible and operational data recoverable.

Deliverables:

- Neon project and database inventory;
- backup and tested restore procedure;
- reviewed migrations and schema;
- authentication and owner-boundary verification;
- provenance and audit records;
- idempotent writes and replay behavior;
- secret-name inventory without secret values;
- environment parity map for development, preview, and production.

### Phase 4: Build the terminal product

Goal: expose verified decisions through a Bloomberg-terminal-inspired interface.

Principles:

- dense information hierarchy;
- keyboard-first navigation;
- compact tables and persistent context;
- restrained semantic status colors;
- audit and drill-down before decoration;
- responsive containment on small screens;
- no formula duplication in UI components.

Primary surfaces:

- analysis terminal;
- comp qualification and exclusion tape;
- scenarios and confidence;
- portfolio;
- watchlist;
- scanner;
- performance;
- data provenance and system status.

### Phase 5: Consolidate and release

Goal: promote one verified system to stable production.

Gates:

- complete formula review;
- passing unit, integration, regression, and end-to-end tests;
- typecheck, lint, and production build;
- migration and restore verification;
- authentication and security review;
- READY Vercel preview with acceptable runtime logs;
- owner acceptance of representative valuation fixtures;
- reviewed release PR from the validated recovery line to `main`.

After promotion, `main` becomes the stable source and Vercel/Neon environments are consolidated deliberately.

## 9. Initial Ownership

### Jules

Best suited for bounded repository work:

- current valuation implementation audit;
- formula coverage mapping;
- test inventory and missing-test report;
- build and dependency diagnostics;
- narrowly scoped test or implementation issues after the spec is approved.

### Hermes

Best suited for independent, slower mathematical review:

- formula-source verification;
- dimensional and unit analysis;
- numerical bounds and invariants;
- conflicting research assessment;
- review of golden fixtures.

Hermes does not directly change production formulas without a separate implementation issue.

### Codex

Project integrator and coordinator:

- maintain roadmap and issue dependencies;
- reconcile NotebookLM, Drive, code, Vercel, and Neon evidence;
- draft specifications and SOPs;
- assign bounded tasks;
- review handoffs and PR evidence;
- perform integration and release verification.

### Jimmy

Product owner:

- approve governance and formula policy;
- make decisions when sources conflict;
- control credentialed or billing-sensitive actions;
- approve release gates and final promotion.

## 10. Vercel and Neon Stabilization

Vercel and Neon are Phase 3 dependencies, not cleanup afterthoughts.

Vercel work will:

- preserve the known-good `mattsapp-test` deployment;
- diagnose failing `mattsapp` deployments;
- inventory domains, framework/runtime settings, Git branch mappings, and environment-variable names;
- verify preview and production separation;
- avoid deleting or relinking projects until the recovery release is proven.

Neon work will:

- identify the exact organization, project, branches, roles, and databases;
- determine which Vercel project points to which Neon branch;
- back up schema and data;
- document migrations and restore;
- prevent test and production data from sharing a database unintentionally;
- rotate credentials only through an explicit owner-approved infrastructure issue.

## 11. Success Criteria

Project control is successful when:

- every active task has one issue, one owner, and explicit acceptance criteria;
- agents follow the same SOPs and produce comparable handoffs;
- no work targets `main` prematurely;
- all unique research and operational assets are inventoried and recoverable;
- the canonical formula is cited, versioned, executable, and covered by golden tests;
- each valuation is reproducible and explainable;
- Vercel and Neon have documented, tested recovery paths;
- the validated application is promoted through a reviewed release PR.
