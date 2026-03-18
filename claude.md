# Claude Sync Notes

## 2026-03-18 — Orchestrator + Subagents

- **AGENTS.md**: Orchestrator instructions — delegate via mcp_task, context budget rules
- **.cursor/skills/**: 6 specialist skills + PROMPT.md (condensed seed for mcp_task injection)
- **.cursor/rules/orchestrator-delegation.mdc**: Delegation flow (alwaysApply)
- **Output files**: development_plan.md (Planner), docs/research.md (Planner)

Flow: Default = direct. Orchestrator opt-in (user request or agent recommends + user confirms). Never load multiple domains (API + Frontend + Storage) in one turn when delegating.

---

## Project Summary

SatTrack — Nuxt 4 PWA for ham radio satellite tracking. N2YO, Space-Track, SatNOGS APIs. Polar plot, AR mode. IndexedDB + AES for credentials. Vercel deploy.
