# Claude / Cursor — project sync

Short rules so **Claude CLI** and **Cursor** stay aligned with **`AGENTS.md`** and **`.cursor/agents/`**.

## Agent layout

- **`.cursor/agents/*.md`** — Task definitions (**`orchestrate`**, **`coder`**, **`code-review`**, **`verifier`**, …).
- **`.cursor/skills/<name>/SKILL.md`** — skills including **`orchestrate`**, **`coder`**, **`code-review`**, **`feature-workflow`**, **`debugger-specialist`**, **`utility-specialist`**, …
- **`.cursor/rules/*.mdc`** — shared constraints; each workflow **`SKILL.md`** says which rules apply.

## Orchestration

- **`/orchestrate`** **chooses** which subagents to run (**Task** `code-explorer`, `code-architect`, `coder`, `code-review`, `verifier`, …) and order. The user can always override.
- **Interview-first:** orchestrator **asks** before large plans or handoffs when anything is unclear — **no full plan** until you answer or say to assume defaults; **suggestions** (A/B, trade-offs) welcome.
- **After** clarifications: optional **Task** **`code-explorer`** or **`code-architect`** when those exist under **`.cursor/agents/`** — see **`orchestrate.md`**; do not stack all recon Tasks by default.
- **Skills:** agents load **`.cursor/skills/`** when the task matches a skill’s `description`. **Do not use MCP** for this workflow unless the project owner explicitly adds it.

## OpenSpec

- **`/opsx:archive`** only in **`/orchestrate`**, **after** **`/code-review` READY** — not in coder/review steps.

## Integrations → CLI, not MCP

Prefer **terminal / CLI**: `git`, `gh`, `npm`, `nuxi`, `openspec`, project scripts. Reach for **`gh`** (issues, PRs) instead of MCP GitHub tools when both exist.

## Git (hard gate)

- **Never** **`git commit`**, **`git push`**, or **remote-affecting merges** without **explicit user approval** in the thread. Propose exact commands and message → **wait for clear yes** → then run.
- **Merge to `development`:** only after approval — **utility-specialist**, **feature-workflow**, or **`gh`**; not silent from agents.
- Applies to **all** agents, including **`/orchestrate`** after **`/code-review` READY** and pauses. Local **`git status` / `diff` / `log`** without writing history is fine.

## Models

- YAML **`model:`** in agent files is a **preferred** tier when that build exists (e.g. Opus / Sonnet).
- Use **whatever model the product offers** that fits the step: Haiku, Sonnet, Opus, **Composer**, etc.
- If the user’s **subscription is exhausted** or a model is unavailable, pick **Composer**, **Auto**, or another **free / included** model that is **sufficient**; mention the fallback briefly if it affects quality.

## Project summary

**SatTrack** — Nuxt 4 PWA for ham radio satellite tracking. N2YO, Space-Track, SatNOGS APIs. Polar plot, AR mode; live pass position can use **TLE + satellite.js (SGP4)** in-browser when cached TLE exists (default), else N2YO. iOS PWA: `webkitCompassHeading` when available. AR offsets in Settings (azimuth / elevation bias). IndexedDB + AES for credentials. Vercel deploy.

## Where to read more

**`AGENTS.md`**, **`.cursor/agents/orchestrate.md`**, **`docs/agents-and-skills.md`** (if copied from the **cursor-agent-workflow** template).
