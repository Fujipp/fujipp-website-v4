---
name: github-push-guide
description: Commit and push this repository's completed changes in clean Conventional Commit groups separated by project scope. Use when asked to commit, push, publish, upload to GitHub, or split commits by folder for this project.
---

# GitHub Push Guide

## Workflow

1. Inspect before staging:

```bash
git status --short --ignored
git branch --show-current
git remote -v
git log --oneline -5
```

2. Stage only changes belonging to the completed task. Never commit secrets, local environment files, build output, dependency directories, logs, or IDE state.

Do not stage:

```text
**/.env
**/.env.*
!**/.env.example
!**/.env.*.example
**/node_modules/
**/dist/
**/build/
**/target/
**/coverage/
**/.idea/
*.log
```

3. Group related changes by scope. Split unrelated folder work into separate commits; keep cross-folder files together only when they are inseparable parts of one behavior.

If the worktree contains both feature code and a skill or instruction update, commit them separately so each change is easy to review and revert.

When the user asks to "push" changes, prefer this order:

1. Inspect the working tree and identify each scope.
2. Stage only one scope at a time.
3. Commit each scope with a Conventional Commit message that matches the folder or purpose.
4. Push after every logical commit, or after the final grouped commit if multiple scopes are intentionally part of one change request.

| Path | Scope | Example |
| --- | --- | --- |
| `frontend/` | `frontend` | `feat(frontend): add dashboard navigation` |
| `backend/` | `backend` | `fix(backend): configure datasource connection` |
| `database/`, `supabase/` | `database` | `feat(database): add profile schema` |
| `docker/` | `docker` | `chore(docker): configure services` |
| `infrastructure/` | `infra` | `chore(infra): add deployment variables` |
| `docs/`, `.agents/skills/` | `docs` or `skills` | `docs(skills): add push workflow` |
| `.github/` | `ci` or `github` | `ci(github): add build workflow` |
| root config files | `root` | `chore(root): update ignore rules` |

4. Use Conventional Commits:

```text
feat(scope): add a user-facing capability
fix(scope): correct broken behavior
chore(scope): update maintenance or configuration
docs(scope): update documentation or agent guidance
refactor(scope): restructure without behavior changes
test(scope): add or repair tests
build(scope): update build tooling or dependencies
ci(scope): update automation workflows
```

Prefer messages describing the result, not file mechanics.

5. Run checks appropriate to the staged scope before committing when feasible:

```bash
# frontend/
bun run build

# backend/
./mvnw test
```

For database/schema changes, review migrations and do not run destructive SQL without explicit user approval.

6. Commit each logical group, then push to the current branch. Detect the branch instead of assuming its name.

```bash
git branch --show-current
git add <paths-for-one-scope>
git commit -m "<type>(<scope>): <result>"
git push origin <current-branch>
```

If no upstream exists:

```bash
git push -u origin <current-branch>
```

## Rules

- Commit and push only when explicitly requested.
- Do not stage existing unrelated user changes.
- Do not reveal secrets in output, commit messages, diffs, or logs.
- Report commit hashes, messages, branch, push result, and validation results after completion.
