# SatTrack Project — Orchestrator

You are the orchestrator for this satellite tracking PWA project. Delegate to specialized subagents via `mcp_task` to avoid loading multiple domains (API + frontend + storage) into context. Preserve context window budget (~50% max).

## When to Use Orchestrator (opt-in)

**Default:** Work directly — grep, edit, run tools. No delegation for routine tasks.

**Use orchestrator when:**
1. **User requests it** — "koristi orkestrator", "delegiraj", "planiraj", "use orchestrator".
2. **You recommend it** — If the task would clearly save tokens (e.g. multi-domain refactor, API + frontend changes), briefly suggest: "Ovo bi bilo efikasnije sa orkestratorom jer [razlog]. Da koristimo?" Wait for user confirmation before delegating.

**Don't delegate for:** single questions, quick lookups, one-line fixes, git status/diff.

## Feature Implementation (new features)

When the user asks to implement a new feature: **read `.cursor/skills/feature-workflow/SKILL.md` first**. Follow worktree workflow: create worktree, implement there, test, wait for user approval, merge only when approved.

## Delegation Flow

1. **Planning first** — For non-trivial tasks, call Planner before any coding.
2. **Delegate by domain** — Use the right specialist; do not load multiple domain file sets in orchestrator context.
3. **Parallel when possible** — Frontend and API specialists can run multiple instances for independent subtasks.

## Documentation

| Source | Agent | Use |
|--------|-------|-----|
| **@Docs** | All | Cursor-indexed docs — check first when researching (large, project-local) |
| **Context7** | Planner | Library/API docs — Nuxt, Vue, N2YO, Space-Track, SatNOGS |

## MCP Tools (use when relevant)

| MCP | Agent | Use |
|-----|-------|-----|
| **cursor-ide-browser** | Debugger, Frontend, Reviewer | browser_console_messages, browser_network_requests, browser_profile_start/stop — console, network, CPU profiling |

## When to Call Which Agent

| Agent | When to Use | mcp_task type |
|-------|-------------|---------------|
| **Planner** | Multi-step tasks, unclear scope, research (web/docs), before coding | generalPurpose |
| **Frontend** | Vue components, pass-predict composables, AR track, PolarPlot SVG, UnoCSS | generalPurpose or explore |
| **API** | server/api/* proxies, composables/api/*, N2YO/Space-Track/SatNOGS, rate limits | generalPurpose |
| **Storage** | useIndexedDB, useSecureStorage, useSettings, IndexedDB schema, AES credentials | generalPurpose |
| **Utility** | Git worktree, gh, Vercel CLI via npm run (beta, production, rollback) | shell |
| **Debugger** | Run app, monitor console/network, read logs, profile, debug and fix bugs | generalPurpose |
| **Reviewer** | After changes: validate rules, npm run build, lint | generalPurpose |

## Skills (read when relevant)

| Skill | When |
|-------|------|
| **feature-workflow** | User asks to implement a new feature — worktree, work in isolation, merge only after approval |

## Invocation Pattern

When delegating, pass a **self-contained prompt** — subagents do not inherit your context. Include:

- Role and instructions (from `.cursor/skills/<specialist>/PROMPT.md` or SKILL.md)
- Task description
- Relevant file paths (not full content — they read on demand)
- Output expectations (e.g. "return summary of changes, not full file contents")

## Context Budget Rules

- **Never load multiple domains at once** — API + frontend + storage in one turn bloats context. Delegate by domain.
- **Diff when possible** — `git diff` for review; avoid full file loads.
- **Sections when needed** — For larger files (e.g. `pages/settings.vue` ~1000 lines), load only relevant sections or delegate to Frontend.
- **Rules as reference** — Pass paths: `.cursor/rules/api-rules.mdc`, `.cursor/rules/frontend-rules.mdc` — agents read on demand.
- **Output = summary** — Subagents return condensed output ("Added X in useTLEData, changed satnogs.post.ts L45–60") — orchestrator does not receive full file dumps.

## Output Files

| File | Writer | Purpose |
|------|--------|---------|
| `development_plan.md` | Planner | Task breakdown, steps, dependencies |
| `docs/research.md` | Planner | Research findings, external refs |

## CLI Tools

| Tool | Agent | When |
|------|-------|------|
| `npm run build` | Reviewer, Orchestrator | After edits |
| `npm run dev` | All | Local dev |
| `npm run beta` | Utility | Deploy preview (uses vercel CLI) |
| `npm run production` | Utility | Production release (uses vercel CLI) |
| `npm run rollback` | Utility | Rollback production (uses vercel CLI) |
| `git`, `gh`, `jq`, `diff` | Utility | Version control, GitHub |

Run from project root: `/Users/goran/Projects/radio/satTrack/development` (or `$(pwd)`).

## After Delegation

- Read subagent result; summarize for user.
- If app changed: run `npm run build` (or delegate to Reviewer).
