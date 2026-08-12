# Task 2 Report — Product UI, Navigation, and Authentication UX

Date: 2026-08-12

## Status

Implemented Task 2 only. No deployment was performed and no database migration, seed, write, or verification command was run.

## Behavior delivered

- Replaced `/` with a mobile-first, API-backed Analyze a Card workflow.
- Added exact card identity, raw/graded handling, asking price, acquisition/grading/selling costs, target ROI, holding period, and a real manual-comp repeater.
- Added comp duplication via an accessible copy icon, add/remove controls, automatic/manual evidence selection, and required override reasons.
- Preserved controlled form state across API and calculation errors.
- Added in-flight and identical-payload duplicate-submit protection.
- Rendered explicit Collector Value and Resale Deal results. Collector Value is labeled evidence-only and deliberately has no red/green recommendation. Resale Deal shows score, ROI, target, and red/amber/green signal.
- Rendered Evidence Confidence, price/return tape, timing outlook, forecast table, raw evidence ledger with inclusion/exclusion reasons, and ordered calculation tape.
- Added analysis actions for purchased/passed decisions, save-to-watchlist, and copy-analysis JSON.
- Added `/history` with decision filtering, immutable snapshot rows, detail results, and decision updates.
- Added `/watchlist` with star toggle, starred/all/status filters, starred/newest/oldest/card sorts, notes updates, removal, and empty states.
- Added `/settings` with persisted target ROI default and fixed owner-account summary.
- Added persistent active desktop navigation and mobile bottom Analyze / History / Watchlist / More navigation.
- Added accessible mobile More dialog with Portfolio, Performance, Import Data, Settings, and Logout.
- Kept desktop Logout available in the persistent header.
- Changed `/scanner` and `/analysis/demo` to permanent redirects to `/history`.
- Added global noindex/nofollow/nocache metadata.
- Removed displayed runtime demo mode from home, import, portfolio, and performance pages. Portfolio and Performance now load real scope only and show useful empty states.
- Removed synthetic legacy exports from runtime; the authenticated legacy export endpoint now returns `410 Gone` with migration guidance.
- Changed Import Data to real data only with an empty CSV header template.
- Improved login with fixed configured owner email display, show/hide password control, Caps Lock warning, correct autocomplete, 8-character minimum across UI/API/auth configuration, duplicate-submit guard, and touch-sized controls.
- Preserved the dark terminal identity, auditable numeric presentation, and responsive table containment.

## Files added

- `src/app/analyze.css`
- `src/app/history/page.tsx`
- `src/app/history/history.css`
- `src/app/watchlist/page.tsx`
- `src/app/watchlist/watchlist.css`
- `src/app/settings/page.tsx`
- `src/app/settings/settings.css`
- `src/components/terminal/app-navigation.tsx`
- `src/features/analysis/analysis-record.ts`
- `src/features/analysis/analysis-record.test.ts`
- `src/features/analysis/analysis-result.tsx`
- `src/features/analysis/analyze-workspace.tsx`
- `src/features/analysis/history-screen.tsx`
- `src/features/analysis/watchlist-screen.tsx`
- `src/features/analysis/settings-screen.tsx`
- `src/features/auth/owner-login-form.test.tsx`

## Files changed

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/session-controls.css`
- `src/app/login/page.tsx`
- `src/app/scanner/page.tsx`
- `src/app/analysis/demo/page.tsx`
- `src/app/data/page.tsx`
- `src/app/portfolio/page.tsx`
- `src/app/performance/page.tsx`
- `src/app/api/auth/owner-login/route.ts`
- `src/app/api/exports/[kind]/route.ts`
- `src/components/terminal/terminal-shell.tsx`
- `src/features/auth/owner-login-form.tsx`
- `src/features/imports/data-console.tsx`
- `src/features/portfolio/portfolio-terminal.tsx`
- `src/features/performance/performance-terminal.tsx`
- `src/features/performance/performance-table.tsx`
- `src/lib/auth/config.ts`

## Verification commands and results

- `pnpm.cmd lint` — passed, zero warnings/errors.
- `pnpm.cmd typecheck` — passed.
- `pnpm.cmd test` — passed: 11 test files, 21 tests.
- `pnpm.cmd build` — passed with Next.js 16.3.0; all Task 2 routes compiled and the route manifest includes `/`, `/history`, `/watchlist`, `/settings`, `/scanner`, and `/analysis/demo`.
- `git diff --check` — passed; only Windows line-ending conversion notices were emitted.

Focused tests added:

- Immutable analysis snapshot/card-label and minor-unit formatting.
- Fixed owner identity, password autocomplete, 8-character minimum, and reveal/hide behavior.

## Self-review

- Task 2/global-constraint scope: no schema, migration, repository, deployed environment, or production database changes.
- Owner boundary: every new data screen first calls `requireOwner`; all mutations use the Task 1 authenticated owner APIs.
- Synthetic data: no displayed page imports a demo fixture or defaults to demo scope. The remaining demo fixture modules are retained for existing lower-level tests but are not routed or rendered.
- Intent separation: Collector Value compares card-only ask to evidenced fair center; Resale Deal renders cost-inclusive ROI/score separately.
- Raw cards: selecting Raw hides grader/grade inputs and states that no future grade is predicted.
- Validation resilience: form inputs are controlled and not cleared on server failure; custom override validation reports without changing inputs.
- Submit safety: Analyze and Login guard in-flight submissions; Analyze also rejects an identical successful payload until an input changes; watchlist save disables after success.
- Accessibility: labels are associated by containment, icon buttons have accessible names, dialog state is announced, Escape closes More, touch controls are at least 44–46px, focus styling remains visible, and Caps Lock state is announced.
- Mobile: layout collapses to one/two columns, bottom navigation is fixed, More opens above it, sticky submit clears the nav, result actions stack, and tables remain horizontally contained.

## Concerns / follow-up boundary

- No authenticated browser smoke test was performed because this task explicitly prohibited touching the database and a real owner session requires the configured auth database. Compile, unit, route, and production-build verification passed.
- Portfolio/Performance end-to-end real-data completion and browser coverage remain Task 3 by plan.
- Existing demo fixture/source modules remain for legacy unit coverage; they have no displayed runtime route. Removing them entirely would be a broader cleanup with test/export implications outside Task 2.

## Fix Round 1 — 2026-08-12

Addressed every item in `private/task-2-review.md` (C1-C3, I1-I6, M1-M2).

### Critical-path corrections

- C1: The manual comp repeater now collects player, year, brand, set, card number, parallel, raw/graded condition, grader, and grade for every comp. `buildManualAnalysisRequest` always sends that structured `card` object. The UI explicitly says structured fields drive matching and provides a deliberate `Use target identity` shortcut. `ManualAnalysisService` regression coverage proves a wrong-player comp produces `WRONG_PLAYER` and is excluded while the matching comp remains included.
- C2: Analyze keys `AnalysisResultView` by `analysis.id`, remounting analysis, decision, watch-save, busy, and message state for every successful run. A mocked-route component test submits two distinct successful analyses and proves the second card replaces the first.
- C3: `/portfolio` no longer sends canonical Task 1 manual-analysis snapshots through the incompatible legacy `PostgresTradingLedger` read model. Until Task 3 connects portfolio persistence, it renders the safe real-only empty state. A page test renders this boundary without database or legacy-loader access.

### Audit, reliability, and accessibility corrections

- I1: Evidence rows now show automatic eligibility, manual force-include/exclude state, and the exact owner override reason. Component coverage verifies forced include and forced exclude audit rows.
- I2: Analyze, Login, analysis decisions/watchlist save, Settings load/save, Watchlist load/update/delete, and clipboard actions now handle rejected promises. Mutations use `try/catch/finally`; busy controls unlock; optimistic watchlist stars roll back; load failures render unavailable states with Retry rather than empty states.
- I3: Watchlist note drafts are controlled per item with explicit `SAVING`, `SAVED`, and `NOT SAVED · ROLLED BACK` states. Failed responses restore both stored item state and the visible textarea value. Regression coverage verifies the rollback.
- I4: Mobile More now moves focus to Close, traps forward/reverse Tab, closes on Escape, applies `inert` plus `aria-hidden` to header/main/bottom navigation, restores their prior state, and restores focus to the trigger. A component test covers focus entry, both trap directions, containment, Escape, and restoration.
- I5: Watchlist filter options are generated from the canonical full `purchaseStatuses` enum, including `MISSED` and `CANCELLED`.
- I6: Added meaningful component/page/route regression coverage for structured request payloads, mismatched comp exclusion, two-result replacement, Analyze/Login network recovery, override audit rendering, Watchlist optimistic/note rollback, unavailable/retry state, full status filters, modal focus behavior, active-route semantics, Portfolio safety, scanner redirect, and robots metadata.
- M1: Comp duplicate/remove controls and password reveal have effective minimum 44px width and height; existing general icon controls remain 44px minimum.
- M2: Active desktop/mobile links expose `aria-current="page"`; the active More destination and More trigger expose current state when applicable.

### Fix Round 1 verification

- Focused regressions: `pnpm.cmd vitest run src/features/analysis/manual-analysis-service.test.ts src/features/analysis/task2-ui.test.tsx src/features/analysis/watchlist-screen.test.tsx src/features/analysis/settings-screen.test.tsx src/components/terminal/app-navigation.test.tsx src/features/auth/owner-login-form.test.tsx src/app/portfolio/page.test.tsx src/app/route-semantics.test.ts` — passed, 8 files / 19 tests.
- `pnpm.cmd lint` — passed, zero warnings/errors.
- `pnpm.cmd typecheck` — passed.
- `pnpm.cmd test` — passed, 17 files / 36 tests.
- `pnpm.cmd build` — passed; production route manifest compiled successfully.
- `git diff --check` — passed; Windows line-ending conversion notices only.

### Fix Round 1 self-review and remaining boundary

- Each reviewer finding was mapped to code plus direct regression evidence.
- No schema, migration, database, deployment, or secret changes were made.
- Portfolio and Performance persistence remain Task 3. Task 2 deliberately presents the safe real-only Portfolio empty state rather than reading canonical analyses with an incompatible legacy model.
- Authenticated production database/browser persistence was not exercised because this task remains explicitly database-free; mocked authenticated client routes plus server/page route tests cover the Task 2 transitions without external writes.

## Fix Round 2 — 2026-08-12

Addressed N1 from `private/task-2-re-review.md`.

- Evidence ledger rows now render automatic matcher reasons as their own `AUTO REASONS` audit line for every comp, including manually overridden comps.
- Manual action and exact owner override reason remain separate lines, so a force-included comp simultaneously shows `AUTO: EXCLUDED`, `MANUAL: FORCE INCLUDE`, the concrete automatic code (for example `WRONG_PARALLEL`), and the owner reason.
- Extended `task2-ui.test.tsx` to require `AUTO REASONS: WRONG_PARALLEL` alongside `OVERRIDE: Trusted visual verification`.

Verification:

- `pnpm.cmd vitest run src/features/analysis/task2-ui.test.tsx` — passed, 1 file / 5 tests.
- `pnpm.cmd lint` — passed.
- `pnpm.cmd typecheck` — passed.
- `pnpm.cmd test` — passed, 17 files / 36 tests.
- `pnpm.cmd build` — passed.
- `git diff --check` — passed; Windows line-ending conversion notices only.

No database, deployment, schema, migration, or secret changes were made.
