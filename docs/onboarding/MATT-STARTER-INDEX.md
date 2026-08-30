# Matt Starter Index

This is the short list of files that matter most when we are getting `mattsapp` back into a clean, testable full app.

Keep this doc current when the canonical app root or the core formula path changes.

## Canonical App Root

- `C:\Work\Projects\mattsapp(2)\mattsapp`

## Core Product Docs

- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\README.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\AGENT-INSTRUCTIONS.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\CHANGE-VALIDATION.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\LOGIC.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\Nav.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\Analysis-Guide.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\MATT-REFERENCE.md`
- `C:\Work\Projects\mattsapp(2)\mattsapp\docs\onboarding\MERGE-PROCESS.md`

## Core Formula Path

These files define the calculation and evidence chain we should preserve first:

- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\valuation.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\valuation.test.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\match-comp.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\confidence.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\scenario.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\fees.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\auction.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\valuation\exclusions.ts`

## Analysis Flow

- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\run-analysis.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\demo-analysis.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\analysis-result.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\analyze-workspace.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\history-screen.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\analysis-terminal.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\analysis\analysis-record.ts`

## Supporting Product Areas

- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\portfolio\portfolio-service.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\portfolio\portfolio-terminal.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\performance\performance-terminal.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\performance\metrics.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\market\source-registry.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\market\source-status.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\features\market\alerts.ts`

## Navigation And UI Shell

- `C:\Work\Projects\mattsapp(2)\mattsapp\src\components\terminal\terminal-shell.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\components\terminal\app-navigation.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\app\history\page.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\app\settings\page.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\app\scanner\page.tsx`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\app\watchlist\page.tsx`

## Data And Provenance

- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\db\schema\core.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\db\schema\index.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\db\repositories\analysis-workflow.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\db\repositories\analysis-runtime.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\db\repositories\market-records.ts`
- `C:\Work\Projects\mattsapp(2)\mattsapp\src\lib\db\repositories\trading-ledger.ts`

## Validation Commands

Use the repository scripts from `package.json`. The usual checks to run before calling the app testable are:

- tests
- typecheck
- lint
- build
- e2e or UI smoke tests when behavior changes

## Scratch Policy

Do not delete recovered material casually.

Keep unused or uncertain copies in:

- `C:\Work\Projects\mattsapp\scratch`

Use the scratch folder for anything we are not promoting into the canonical app root yet.
