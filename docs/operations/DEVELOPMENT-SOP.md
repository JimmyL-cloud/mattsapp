# Mattsapp Development SOP

## Lifecycle

1. Assign one bounded GitHub issue.
2. Read required SOPs and approved decisions.
3. Confirm dependencies and approved base branch.
4. Create a scoped branch.
5. For behavior changes, write a failing test.
6. Run it and record the expected failure.
7. Implement the minimal scoped change.
8. Run focused tests, then required project checks.
9. Review the diff for scope, secrets, formula impact, and data/deployment impact.
10. Open a draft pull request.
11. Complete the handoff template.
12. Obtain required code, math, owner, or infrastructure review.
13. Merge only when the issue's acceptance criteria and authorization are satisfied.

## Branches

Use `recovery/<scope>`, `formula/<scope>`, `audit/<scope>`, `infra/<scope>`, `feature/<scope>`, or `ui/<scope>`. Base from `repair/mattsapp-test` unless the issue explicitly names a later reviewed integration branch. Never base routine work on `main`.

## Required Commands

When applicable:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

UI behavior changes also require focused interaction or end-to-end verification. Database changes require migration and restore-safe review. Infrastructure issues require readback verification without secret disclosure.

## Pull Request Evidence

- linked issue and approved decisions;
- base and head SHAs;
- summary and exact files;
- failing-test evidence where required;
- command/result table;
- formula impact;
- database/migration impact;
- Vercel/Neon impact;
- security and privacy considerations;
- rollback path;
- completed handoff.

## Merge Restrictions

- Draft PRs are not mergeable.
- Formula PRs require math review and approved claim IDs.
- Migration PRs require backup/restore evidence.
- Release PRs require REL-001.
- Agents do not self-approve or self-merge.
