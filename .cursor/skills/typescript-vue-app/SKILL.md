---
name: typescript-vue-app
description: >-
  Strict, practical TypeScript in Vue 3 / Nuxt 4 apps — SFC script setup,
  props/emits typing, composables; fits cwf coder/review loop (build + typecheck).
---

# TypeScript in Vue / Nuxt apps (cwf-aligned)

For **application** code (`.vue`, `composables/`, `utils/` in a Nuxt or Vite+Vue repo). For **library authoring** (dual packages, `tsdown`), prefer the **`ts-library`** skill from [onmax/nuxt-skills](https://github.com/onmax/nuxt-skills) or your project’s own standards.

## Workflow

- Run **`vue-tsc` / `nuxi typecheck` / `tsc --noEmit`** when the project defines them — before **`/code-review`** when practical.
- **`coder`** implements; **`code-review`** catches type regressions with the rest of CI.

## Rules of thumb

| Topic | Prefer |
|--------|--------|
| **Props / emits** | `defineProps` / `defineEmits` with explicit types or interfaces; avoid loose `any` on public component APIs. |
| **Composables** | Explicit return types when inference spans files or is ambiguous; document generic constraints. |
| **Narrowing** | Discriminated unions, guards; avoid non-null assertions unless justified. |
| **Imports** | Match project alias (`~`, `@`, `#imports` in Nuxt); no duplicate type + value confusion. |
| **`any` / `unknown`** | Replace `any` with real types or `unknown` + narrow; eslint `@typescript-eslint` rules win if configured. |
| **Templates** | Keep script logic typed; heavy logic belongs in composables or server code with tests. |

## Nuxt 4 specifics

- Use **auto-imports** intentionally; if types are missing, fix `tsconfig` / Nuxt generated types (`nuxi prepare`) rather than silencing with `// @ts-ignore`.
- Server code: type **event** and **return** shapes for handlers; align with h3 types.

## Optional ecosystem skills

[onmax/nuxt-skills](https://github.com/onmax/nuxt-skills) (MIT) bundles **`vue`**, **`vite`**, **`vitest`**, **`pnpm`** skills maintained against upstream — install with `npx skills add onmax/nuxt-skills` when you want full checklists beyond this short skill.
