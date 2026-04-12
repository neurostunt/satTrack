# SatTrack — Agent notes

**Default:** work directly (search, edit, terminal). For OpenSpec-driven work, follow the sequence below.

**Project sync:** root **`CLAUDE.md`** mirrors these rules for Claude CLI / Cursor.

## OpenSpec workflow (`.cursor/skills/` + **`.cursor/agents/`**)

| Order | Invoke | Purpose |
|-------|--------|---------|
| 1 | **`/orchestrate`** | Plan: `/opsx:propose`, artifacts under `openspec/changes/<id>/` |
| 2 | **`/coder`** | Implement; commit + push `feature/*`; **no** `/opsx:archive` |
| 3 | **`/code-review`** | Build, lint, verdict **READY** or **NEEDS FIXES**; **no** `/opsx:archive` |
| 4 | **`/orchestrate`** again | **Only after READY:** **`/opsx:archive <id>`** — closes change, optional sync to `openspec/specs/` |

**Rule:** **`/opsx:archive`** runs **only** in step **4** (orchestrator), **never** before code-review **READY**.

**Specs:** **draft** = `openspec/changes/<id>/` (proposal, design, tasks, optional **`specs/`** deltas). **Canonical** = `openspec/specs/<capability>/spec.md`. **Promote** draft → canonical at **`/opsx:archive`** sync (step 4), not before code-review **READY**. Details: **`.cursor/skills/orchestrate/SKILL.md`** (“Where specs live”).

OpenSpec commands: **`.cursor/commands/`** — `/opsx:propose`, `/opsx:apply`, `/opsx:explore`, `/opsx:archive`.

Details and rules are in each **`SKILL.md`**.

## Orchestration, skills, CLI (no MCP by default)

- **`/orchestrate`** **decides** which **Task** subagents to run (`code-explorer`, `code-architect`, `coder`, `code-review`, `verifier`, …) and when; you can override anytime.
- **Interview-first:** clarifying questions before big plans or delegation when anything is unclear; **no full plan** until resolved **or** you say to assume defaults; **suggestions** (options, trade-offs) encouraged.
- **After** the interview: optional **Task** **`code-explorer`** or **`code-architect`** when installed — see **`orchestrate.md`**. Pick **one** recon path by default, not all.
- Agents load **`.cursor/skills/`** when a skill’s description fits. **Do not use MCP** unless you deliberately add it to the project.
- Prefer **CLI**: **`gh`**, **`git`**, **`npm`**, **`openspec`**, project scripts.

## Other skills (`.cursor/skills/`)

| Skill | Purpose |
|-------|---------|
| **orchestrate** | OpenSpec plan + `/opsx:archive` only after **READY** |
| **coder** | Implementation (`/coder`) |
| **code-review** | Build/lint verdict (`/code-review`) |
| **feature-workflow** | Worktree + feature branch |
| **debugger-specialist** | Runtime debugging |
| **utility-specialist** | Git/gh, deploy |

## Git approval (all agents)

**Never** **`git commit`**, **`git push`**, or **remote-affecting `git merge`** without **explicit user approval** after showing the exact commands and message.

**Merge to `development`:** only when **you** approve — **utility-specialist**, **feature-workflow**, or **`gh`**; not automatic from coder/review. **`/orchestrate`** included: after **`/code-review` READY** and pauses, it **asks** first.

## Models (`.cursor/agents/`)

| Agent | Model target | Frontmatter |
|-------|----------------|-------------|
| **`orchestrate`** | **Claude Opus 4.6** (planning, sequencing, merge) | `model: opus` |
| **`coder`**, **`code-review`**, **`verifier`** | **Claude Sonnet 4.6** | `model: sonnet` |

YAML **`model:`** is a **default** when that tier exists. Use **any model the product exposes** that fits the step. If a **paid subscription is exhausted**, use **Composer**, **Auto**, or another **free / included** model **good enough** for that step.

If your Cursor build ignores `model` in YAML, set each agent’s model manually in **Cursor → Settings / Agents**.

## Cursor — config approval

Per **[Cursor Agent Security](https://cursor.com/docs/agent/security)**, **configuration files** (including much of **`.cursor/`**) require **explicit approval** before the agent writes them. Normal app source often does not.

## Delegation workflow (`.cursor/agents/`)

**`/orchestrate`** runs **Delegation**: **Task `coder`** → **Task `code-review`** → **ask approval** → commit/push (if approved) → **ask approval** → **merge feature → `development`** (if approved) when **READY**. The orchestrator **never** writes application code — implementation is the **`coder`** subagent. Git only, no MR tools from agents.

**Pauses:** After **`coder`** (optional) — wait for **“continue”** before **`code-review`**. After **`code-review`** — **no verifier or merge** in the same turn; **continue** when ready.

| Order | Step | Purpose |
|-------|------|---------|
| 1 | **`/orchestrate`** | Plan: requirements, branch context, **`coder`** / **`code-review`** handoffs |
| 2 | **`/coder`** | Implement; **do not** commit/push unless the user **explicitly** approved git writes |
| — | **You** *(optional)* | **“continue”** → **`code-review`** |
| 3 | **`/code-review`** | Build, lint; **READY** / **NEEDS FIXES** |
| — | **You** | Pause: test, edit, revert — then continue |
| — | **`/verifier`** *(optional)* | After **READY** and pause, before merge |
| 4 | **Closure** | Approve commit/push/merge — **feature → `development`** only with approval |

**Merge** into **`main`**: only when **you** decide. **Protected:** **`main`** / **`master`** — no push/merge from agents without your explicit approval.

Details: **`.cursor/agents/*.md`** (orchestrate, coder, code-review, verifier).

## Extended roster (`library/` in cursor-agent-workflow)

Bootstrap copies **`library/skills/`** to **`.cursor/skills/`** by default. Optional agents: **debugger**, **code-architect**, **code-explorer**, … — see **`docs/agents-and-skills.md`** in the workflow repo. **Refresh:** **`cwf skills /path/to/app`**.

## Project rules

**`.cursor/rules/`** — **`project-overview.mdc`** · **`api-rules.mdc`** · **`frontend-rules.mdc`** · **`git-workflow.mdc`** · **`orchestrator-delegation.mdc`**

## CLI (project root)

`npm run dev` · `npm run build` · `npm run lint` · `npm run beta` / `production` / `rollback` · `git` / `gh` · `openspec`

After substantive edits, prefer **lint** / **tests** / **build** and skimming **`git diff`** before calling work **done** — see **Verification** in **`orchestrate.md`**.

## Cheatsheet (READY → next step)

| Situation | Next step |
|-----------|-----------|
| **`/code-review`** → **NEEDS FIXES** | **`/coder`** fixes → **`/code-review`** again |
| **`/code-review`** → **READY** | Test / edit; then **continue** → optional **`/verifier`** → approve merge → **feature → `development`** |
| OpenSpec change done + **READY** | Second **`/orchestrate`** → **`/opsx:archive <id>`** (not before **READY**) |
| Verifier finds blockers | Same as **NEEDS FIXES** → **`/coder`** → **`/code-review`** |
