# /commit

Creates a commit with a message in Conventional Commits format adapted to finance-manager.

## Format

```
<type>(<scope>): <description in imperative, lowercase, no trailing period>
```

## Types

| Type | When |
|------|------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Refactor without behavior change |
| `test` | Add or modify tests |
| `chore` | Maintenance, dependencies, config |
| `docs` | Documentation |
| `perf` | Performance improvement |

## Project scopes

| Scope | Area |
|-------|------|
| `domain` | Domain layer (entities, value objects, domain services) |
| `application` | Use cases and ports |
| `api` | Route Handlers / Server Actions |
| `db` | Turso schema, migrations, repositories |
| `ui` | React components, pages, layouts |
| `accounts` | Accounts feature |
| `transactions` | Transactions feature |
| `budget` | Budget feature |
| `portfolio` | Portfolio / investments feature |
| `auth` | Authentication |
| `config` | Environment configuration |

## Process

1. Run `git diff --staged` to see the changes
2. If nothing staged: run `git status` and ask the user what to include
3. Infer type and scope from the modified files
4. Propose the commit message
5. Ask for confirmation before running `git commit`

## Examples

```
feat(transactions): add recurring transaction detection
fix(domain): correct Money value object negative amount validation
refactor(budget): extract BudgetOverspendDetector class
test(db): add integration tests for TursoTransactionRepository
chore(config): add TURSO_AUTH_TOKEN to env schema
feat(portfolio): add zustand portfolio store with holdings totals
```

## After committing — create branch and prepare PR

Once commits are done, always:

1. **Create a feature branch** with the commits (they land on `main` locally, so branch from the commit before them and cherry-pick):
   ```bash
   git checkout -b feat/<slug> <base-commit-sha>
   git cherry-pick <commit1> <commit2> ...
   ```

2. **Reset `main`** back to the base commit:
   ```bash
   git checkout main
   git reset --hard <base-commit-sha>
   ```

3. **Provide the PR title and description in markdown** for the user to open on GitHub manually. Format:
   - Title: `<type>: <short description>` (same style as commit messages)
   - Body sections: `## Summary` (bullet points of what changed), `## Architecture decisions` (if relevant), `## Test plan` (checklist)
   - Branch to merge: `feat/<slug>` → `main`
