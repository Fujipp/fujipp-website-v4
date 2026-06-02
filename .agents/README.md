# Project AI Instructions

Read this file before doing anything in this repository.
These rules apply to every AI — Claude, Gemini, Codex, Copilot, and others.
They persist across new chats and context resets.

---

## Non-Negotiable Rules

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

**Never commit or push unless the user explicitly asks.**

When asked to commit or push, follow `.agents/skills/github-push-guide/SKILL.md`.

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

## Section Rules

Each section has its own rules file. Read the relevant one before working:

| Section | Rules file |
| --- | --- |
| Frontend | `.agents/frontend.md` |
| Backend | `.agents/backend.md` |
| Database | `.agents/database.md` |
| Commit / Push | `.agents/skills/github-push-guide/SKILL.md` |
