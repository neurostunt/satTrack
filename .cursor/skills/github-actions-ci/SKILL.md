---
name: github-actions-ci
description: >-
  GitHub Actions workflows, gh CLI, CI secrets, PR checks — no MCP; pair with
  vercel-deployment for deploy workflows.
---

# GitHub Actions & CI (CLI-first)

Use when editing **`.github/workflows/*.yml`**, branch protection, **PR checks**, or **`gh`** automation.

## Before editing workflows

- **Interview / confirm:** which **events** (`push`, `pull_request`, `workflow_dispatch`), **required checks**, **Node/pnpm** versions, **secrets** names (values only in **GitHub → Settings → Secrets**).
- **Never** embed real tokens in YAML; reference `${{ secrets.NAME }}` only.

## `gh` CLI (no MCP)

| Task | Example |
|------|---------|
| Auth | `gh auth status` |
| Workflow list | `gh workflow list` |
| Run workflow | `gh workflow run <file-or-name>` |
| Run logs | `gh run list` / `gh run view <id> --log` |
| PR checks | `gh pr checks <n>` |
| Secret set | `gh secret set NAME` (user runs interactively) |

Docs: [GitHub CLI](https://cli.github.com/manual/), [Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions).

## Workflow patterns (high level)

- **`actions/checkout@v4`** with **`fetch-depth`** if you need history for lint/changed files.
- **Cache:** `actions/cache` or setup actions that bundle caching (e.g. `pnpm/action-setup`).
- **Matrix:** OS / Node version — keep **minimal** unless the repo already uses matrices.
- **Permissions:** use **`permissions:`** least privilege (`contents: read` where possible).
- **Concurrency:** `concurrency: group: … cancel-in-progress: true` for PR floods — only if product owner wants it.

## Vercel + Actions

- Repo may ship **beta/preview** on PR and **production** on tag/main — read existing YAML; align with **`vercel-deployment`** skill and **`DEPLOYMENT.md`**.

## cwf alignment

- YAML edits are normal **`coder`** work; **`git commit`/`push`** only after **user approval** (**`AGENTS.md`**).
- Prefer **`pnpm`/`npm` scripts** already in **`package.json`** in `run:` steps.
