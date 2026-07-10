# Project AI Instructions

Read this file before doing anything in this repository.
These rules apply to every AI — Claude, Gemini, Codex, Copilot, and others.
They persist across new chats and context resets.

---

## Non-Negotiable Rules

### Product Direction

This project is Fujipp's personal platform: a portfolio that shows Fujipp's work and capability,
plus a web shop for selling Discord bot services. The primary users are Fujipp, Fujipp's customers,
and visitors who may evaluate Fujipp's work.

Current product priorities:

- Make the portfolio clearly communicate skill, trust, and real project capability.
- Make the shop usable for buying and managing Discord bot services.
- Keep unfinished shop work honest and coherent instead of pretending the flow is complete.
- Revise UI deliberately with the design system/tokens, not one-off visual guesses.
- Prefer practical, maintainable software that feels like a real person built and can operate it.

Do not invent a new product direction without asking. If a task could pull the platform away from
portfolio + Discord bot shop, stop and confirm first.

### Project Management Operating Mode

Treat every task as product/project work first, then implementation work. Before changing files,
identify:

- The requested scope: Frontend, Backend, Database, infrastructure, docs/agent rules, or mixed.
- The reason for the change and the user-visible outcome.
- The smallest safe delivery unit.
- Whether the work should be split into separate commits/pushes because it touches unrelated areas.

If a task starts drifting outside the original scope, stop and call out the new scope before acting.
Prefer clear, reversible steps over broad rewrites. When several AI agents or model families may work
on the same repository, optimize instructions for explicit source-of-truth files, concrete paths, and
verifiable handoff notes instead of model-specific assumptions.

### Task Intake Template

At the start of implementation work, the AI should be able to state:

- Goal: what user-visible outcome this task should produce.
- Scope: which areas may be touched, and which areas are intentionally out of scope.
- Dependencies: design tokens/Figma, API contracts, backend/database rules, env/config, or external services.
- Plan: the smallest useful steps to make it work without drifting.
- Definition of Done: what "done" means for the user, including whether verification was requested.

Work only inside the task's scope. Ask before expanding scope, adding dependencies, changing architecture,
or choosing between materially different product/technical options. Suggestions are welcome, but they
must be tied to the user's goal and not become side quests.

### Builds and Tests

**Never run a build, type check, test, or browser verification unless the user explicitly asks.**

This applies:
- After any code change
- After UI or layout edits
- When starting a new conversation
- When context was lost and the conversation is resuming

Do not run:
```
npm run build / bun run build
npm run test / bun run test
vue-tsc
./mvnw test
./mvnw package
```

Unless the user says words like: "build it", "run tests", "verify", "check if it compiles".

When you finish a task without running verification, end with:
> "Done. No build or test was run — let me know if you want to verify."

### Commits and Pushes

**Do not commit or push work-in-progress.** But once a task is **complete** (and verified
as far as the user asked), you have standing approval to commit it and get it onto `main` —
you do **not** need to ask again each time. Squash-merging a PR to `main` auto-deploys, so
"done" means done-and-deployed.

When Fujipp explicitly says "push", "push เข้า main", or otherwise asks to publish completed
work, treat that as approval to commit the completed changes and push `main` directly unless the
change is risky enough to require the stop-and-confirm rule below. Before pushing, identify which
CI/CD path filters will run from the files being pushed. Keep frontend-only, backend, service,
database/Supabase, and agent/docs work in separate commits, and never include a backend/service/
database path in a frontend-only push unless Fujipp explicitly asked for that scope too.

Workflow when a task is finished:

1. Branch from `main`, commit in clean Conventional Commit groups
   (follow `.agents/skills/github-push-guide/SKILL.md`), and push.
2. Open a PR and **squash-merge it into `main`** (the auto-deploy runs on merge).
3. Never commit secrets or local env files (see the push guide's exclusion list).

Database migrations are the exception: Supabase watches the persistent
`db/migrations` branch. Pushing a migration to that branch applies it
automatically; merging it to `main` does not apply it.

**Stop and confirm first** (don't auto-merge) when the change is risky or hard to reverse,
touches secrets/infra/migrations you're unsure about, or you aren't confident it's what the
user wanted. When in doubt, ask.

When a completed task spans multiple areas, split commits and pushes by area or decision reason
unless the changes are inseparable parts of one behavior. A combined commit is allowed only when
reviewing or reverting one part without the others would break the delivered outcome.

### File and Scope Changes

**Never do any of the following without explicit instruction:**

- Edit files outside the scope the user asked about
  - e.g. if asked to change frontend, do not touch backend or database files
- Install or remove packages
  - `npm install`, `bun add`, `bun remove`, `mvn` dependency changes
- Create new files that were not mentioned
- Delete or rename any file or folder

If doing the task requires any of the above, **stop and tell the user first**. Do not proceed until confirmed.

---

## Ask Before Acting

Stop and ask the user when:

- The task is unclear or can be interpreted in more than one way
- The task requires changes across more than one section (e.g. both frontend and backend)
- The task requires changing a pattern or architecture (e.g. restructuring folders, changing naming conventions)
- A UI task has no design token or Figma reference to follow

Ask a specific question. Do not guess and proceed.

---

## AI Handoff Protocol

When another AI/model may continue the work, leave a compact handoff note in the final response or
the relevant tracking document. It should include:

- Goal and current status.
- Files changed or intentionally left untouched.
- Decisions made and why.
- Verification run, or the exact reason verification was not run.
- Known risks, TODOs, and next recommended step.
- Any user instruction that must carry forward.

If taking over from another AI, read the handoff first, then re-read the relevant rules and inspect
the current files before continuing. Never assume the prior AI's plan is still valid if the code or
user request has changed.

---

## Section Rules

Each section has its own rules file. Read the relevant one before working:

| Section | Rules file |
| --- | --- |
| Frontend | `.agents/scopes/frontend.md` |
| Backend | `.agents/scopes/backend.md` |
| Database | `.agents/scopes/database.md` |
| Infrastructure / CI / repo ops | `.agents/scopes/infrastructure.md` |
| Commit / Push | `.agents/skills/github-push-guide/SKILL.md` |

After making a change, add a dated entry to the matching per-area changelog in
`docs/changelog/` (see `docs/changelog/README.md` for the versioning scheme).
