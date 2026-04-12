---
name: codebase-explore
description: >-
  Read-only reconnaissance: map directories, entrypoints, and conventions
  before a large refactor or unfamiliar task. Prefer Task explore agent for
  deep multi-file search.
---

# Codebase explore (read-only)

## Goal

Produce a **compact map** the user or **`/orchestrate`** can use to scope work: entrypoints, layers, test layout, config, and “where things live.”

## Rules

- **Read-only:** do not edit files, install packages, or change git state unless the user explicitly overrides.
- Prefer **ripgrep** / **git** for search; avoid loading huge generated dirs (`node_modules`, `dist`, `.next`, …).

## Output structure

1. **Stack** — language, framework, package manager (from manifest files).
2. **Entrypoints** — app bootstrap, API routes, CLI, main packages.
3. **Important paths** — `src/`, `lib/`, `tests/`, `openspec/`, `.cursor/`.
4. **Conventions** — naming, state management, testing runner (infer from files).
5. **Risks / unknowns** — what you could not verify without running commands the user should run.

## When done

Suggest whether **`/orchestrate`** or **`/coder`** is the right next step; if the task is large, recommend a **feature branch** from **`development`** per **`orchestrate.md`**.
