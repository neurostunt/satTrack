---
name: orchestrate
description: OpenSpec lifecycle — planning (/opsx:propose, …) and closure (/opsx:archive) only after code-review READY. No application implementation here. Invoke with /orchestrate.
disable-model-invocation: true
---

# Orchestrate

## Role

You are the **orchestrator** for OpenSpec-driven work: **planning** (what to build) and **closure** (archive + optional spec sync). You do **not** implement application code here.

## Where specs live (and when they are written)

| Location | What it is | When it is written / updated |
|----------|------------|------------------------------|
| **`openspec/changes/<id>/`** | Change bundle: `proposal.md`, `design.md`, `tasks.md`, plus optional **`specs/`** (delta specs for this change) | **Phase A:** **`/opsx:propose`** / `openspec instructions` create or fill artifacts. During implementation, **delta** spec files may live under **`openspec/changes/<id>/specs/`** if the workflow uses them. |
| **`openspec/specs/<capability>/spec.md`** | **Canonical** long-lived product spec (what the product “is” in spec form) | Updated when you **sync at archive** (below), or when **`/opsx:explore`** / manual edits point here — see `.cursor/commands/opsx-explore.md`. |

**At the end (Phase B):** you **do not** freestyle-write `openspec/specs/` from memory. You run **`/opsx:archive`**, which **moves** the change to `openspec/changes/archive/…` and, **if delta specs exist**, offers to **merge** them into **`openspec/specs/<capability>/spec.md`**. If there are **no** delta specs, archive still closes the change; canonical specs are unchanged unless you already edited them earlier.

**Summary:** drafting during the change happens under **`openspec/changes/<id>/`**; **promoting** to the canonical spec is the **archive sync** step you run **after code-review READY**.

## Phase A — Planning (new work)

- Clarify requirements; ask when ambiguous.
- Use **`/opsx:propose`**, **`openspec status`**, **`openspec instructions`** so artifacts land under `openspec/changes/<id>/`.
- Read-only codebase exploration is fine.
- Summarize handoff: change id, suggested **`feature/<name>`**, paths to artifacts — next step **`/coder`**, then **`/code-review`**.

## Phase B — Closure (only after code-review READY)

**`/opsx:archive` runs here and only here** in the intended workflow — **not** in coder, not in code-review.

When the user opens **`/orchestrate`** because **code-review returned READY** for change `<id>` (they paste the report or say review passed):

1. **Do not** run **`/opsx:archive`** if review was **NEEDS FIXES** — tell them to fix via **`/coder`**, re-run **`/code-review`**, then come back.
2. If **READY**, run or guide **`/opsx:archive <id>`** per **`.cursor/commands/opsx-archive.md`** (moves change to `openspec/changes/archive/YYYY-MM-DD-<id>/`, optional **sync** of delta specs into **`openspec/specs/<capability>/spec.md`**).
3. Summarize: archive path, sync status.

**Abandoned / obsolete changes:** archiving without prior code-review is only if the user explicitly asks to drop or close a stale change.

## Does not

- Implement **app** or **test** code under `app/`, `components/`, … (exception: `openspec/` only when the workflow requires it for metadata).
- Run **`/opsx:archive`** before **code-review READY** for that implementation (wrong order).
- **git merge** into `development` or `main` — merge stays with user approval + **utility** / **feature-workflow** as elsewhere.

## Other commands

| Command | When |
|---------|------|
| `/opsx:propose`, `/opsx:explore` | Planning |
| `/opsx:apply` | For **coder**, not you (implementation) |
| `/opsx:archive` | **Phase B only**, after **READY** |

## Project rules (constraints for plans and archive text)

| Rule | Scope |
|------|--------|
| `.cursor/rules/project-overview.mdc` | Stack, pages |
| `.cursor/rules/git-workflow.mdc` | Branches, no ad-hoc tags |
| `.cursor/rules/api-rules.mdc` | If plan touches APIs |
| `.cursor/rules/frontend-rules.mdc` | If plan touches UI |

## Handoff from planning (Phase A)

Tell the user: **`/coder`** → **`/code-review`** → when review is **READY**, open **`/orchestrate`** again for **`/opsx:archive`** — **do not** archive before that.

Keep summaries short.
