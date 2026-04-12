---
name: nuxt-4-app-stack
description: >-
  Nuxt 4+ app work — server routes (h3/Nitro), file routing, composables,
  nuxt.config; aligns with cwf (build/lint, no drive-by refactors). Pair with
  typescript-vue-app for SFC typing.
---

# Nuxt 4+ (app stack) — cwf-aligned

Use for **Nuxt 4.x** application code (not Nuxt 2). Prefer **official docs** when behavior is unclear: [Nuxt docs](https://nuxt.com/docs), [h3 v1](https://v1.h3.dev/), [Nitro](https://nitro.build/).

## Workflow (this repo’s agents)

- **Implementation:** **`coder`** (or **`/orchestrate`** → Task **`coder`**). Do **not** archive OpenSpec or merge — **`/orchestrate`** after **`/code-review` READY** and pauses (**`AGENTS.md`**).
- After edits: run project **`build`** / **`lint`** (e.g. `pnpm run build`, `pnpm run lint`) before handing off to **`/code-review`**.
- Match **`.cursor/rules/*.mdc`** and existing patterns; avoid unrelated refactors.

## High-signal conventions (Nuxt 4+)

| Area | Direction |
|------|-----------|
| **Server / API** | `server/api/*.ts` with `defineEventHandler`; validate input (e.g. Zod + h3 helpers); use `getRouterParam` / typed query — not legacy `context.params` patterns from Nuxt 2. |
| **Data fetching** | Prefer Nuxt composables (`useFetch`, `useAsyncData`) with clear server vs client boundaries; watch keys and SSR/hydration. |
| **Routing** | File-based `pages/` / app router conventions per project; typed routes if enabled in config. |
| **Config** | `nuxt.config.ts` — modules, `runtimeConfig`, Nitro settings; keep changes minimal and documented. |
| **Components** | Prefer **`NuxtLink`**, **`NuxtImg`** (when module present) over raw HTML where the project already does. |

## Deeper reference (optional install)

For **maintained** split reference files (server, routing, composables, config, etc.), add the community pack (MIT):

```bash
npx skills add onmax/nuxt-skills
```

Then use skills such as **`nuxt`**, **`vue`**, **`nuxt-ui`**, **`vitest`** from that repo alongside this one. This skill stays a **short** gate + workflow hook so agents do not load huge bundles unless needed.

## When unsure

Fetch current Nuxt 4 release notes or docs for breaking changes; do not assume Nuxt 3-only snippets without checking the project’s `package.json` major version.
