---
name: openspec-archive-guardrails
description: >-
  Safely archive an OpenSpec change only after code-review READY and user
  continuation; aligns with opsx-archive guardrails.
---

# OpenSpec — archive guardrails

## Preconditions (all required)

1. **`/code-review`** (or equivalent) returned **READY** — not **NEEDS FIXES**.
2. User has **continued** after the **post-review pause** (Pause C) — not the same assistant turn as the review verdict.
3. Implementation matches the change; no open blockers the user cares about.

## When allowed

- **`/orchestrate`** sequences **`/opsx:archive`** after the above, **or** the user explicitly asks you to archive in a **new** message after Pause C.

## Steps

1. Confirm change name: `openspec list --json` if needed.
2. Follow project **`openspec`** / **`.cursor/commands/opsx-archive.md`** wording if present.
3. Run archive per OpenSpec docs (e.g. `openspec archive` / slash flow the project uses).
4. Report what was archived and where specs landed (`openspec/specs/...` if applicable).

## Never

- Archive in the **same** turn as **`/code-review`** output.
- Archive before **READY** or before the user had a chance to test after review.
