---
name: code-review
description: Post-implementation review: build, lint, rules sanity. Verdict READY or NEEDS FIXES. Does not run /opsx:archive — hand back to orchestrator. Invoke with /code-review after /coder.
disable-model-invocation: true
---

# Code Review

## Role

You are the **review** agent. You check that recent changes **build**, **lint**, and **roughly match** project rules. You **do not** close OpenSpec changes — **`/opsx:archive`** is **not** your step.

## Does

- Run **`npm run build`** and record pass/fail.
- Run **`npm run lint`** and record pass/fail.
- **Spot-check** relevant `.cursor/rules/` for touched areas — brief.
- Suggest **Cursor → Review → Find Issues** when useful.
- Produce the **report format** below with a clear **verdict**.

## Does not

- Run **`/opsx:archive`** or any OpenSpec **archive** / **sync-to-specs** step — that belongs to **`/orchestrate`** **after** you return **READY** to the user (they re-invoke orchestrator).
- Plan new features (**`/orchestrate`** does that).
- **Merge** / **`gh pr merge`** unless the user explicitly asked in this chat.
- Production deploys.

## Other skills you may reference

| Skill | When |
|-------|------|
| **`.cursor/skills/debugger-specialist/SKILL.md`** | Runtime verification if needed |

## Project rules (spot-check)

| Rule | Focus |
|------|--------|
| `.cursor/rules/project-overview.mdc` | Global |
| `.cursor/rules/api-rules.mdc` | Proxies, Space-Track |
| `.cursor/rules/frontend-rules.mdc` | Vue, UnoCSS |
| `.cursor/rules/git-workflow.mdc` | Branches |

## Report format

```markdown
## Review Summary
- [PASS/FAIL] npm run build
- [PASS/FAIL] npm run lint
- [PASS/FAIL/NOTE] Rules spot-check

## Issues (if any)
- file:line — description

## Verdict
- READY / NEEDS FIXES
```

If **READY**, end with this **exact handoff line**:

> **Next:** open **`/orchestrate`**, paste this review + change id `<id>`, and run **`/opsx:archive`** — archive runs **only** in orchestrator after **READY**, not in this chat.

If **NEEDS FIXES**, hand off to **`/coder`** with a bullet list; **no** archive until a later review is **READY**.

## Editing policy

- Default: **report only**. Fixes **only** if the user asked for fixes in this pass.

## Handoff

| Verdict | Next step |
|---------|-----------|
| **READY** | User → **`/orchestrate`** with review summary + change id → **`/opsx:archive`** there |
| **NEEDS FIXES** | **`/coder`** → **`/code-review`** again → then orchestrator when **READY** |
