---
name: openspec-apply-change
description: >-
  Apply implementation work from an OpenSpec change using openspec CLI
  (status, instructions apply, tasks). Use when /opsx:apply is not available
  or you need a checklist-style run.
---

# OpenSpec — apply a change

Use this skill when the project has **OpenSpec** and an active change under `openspec/changes/<name>/`.

## When to use

- User asks to **implement** or **continue** tasks for a named change.
- Slash command `/opsx:apply` is missing or you need explicit CLI steps.

## Steps

1. **Resolve the change id**  
   If ambiguous, run `openspec list --json` and ask which change to use. Announce which change id you are using and how to override (e.g. another change name).

2. **Inspect status**

   ```bash
   openspec status --change "<name>" --json
   ```

   Note `schemaName` and which artifact holds tasks (often `tasks`).

3. **Load apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   Use returned paths and task list as the source of truth.

4. **Implement** per `tasks.md` / plan — match project **`.cursor/rules/*.mdc`** and existing code style.

5. **Re-check status** before finishing; summarize files touched, remaining tasks, and suggested next step (**`/code-review`**, not archive).

## Do not

- Run **`/opsx:archive`** or merge branches — that belongs to **`/orchestrate`** after **READY** and the post-review pause (see **`AGENTS.md`**).
