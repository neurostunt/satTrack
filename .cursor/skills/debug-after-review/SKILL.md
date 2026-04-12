---
name: debug-after-review
description: >-
  After code-review NEEDS FIXES or flaky tests: form hypotheses, reproduce,
  minimal fix. Use with /coder or a dedicated debugger agent.
---

# Debug after review

## When to use

- **`/code-review`** → **NEEDS FIXES**
- Intermittent failures, wrong behavior, or missing edge cases called out in review

## Approach

1. **Restate the failure** — exact command, file, line or assertion, expected vs actual.
2. **Reproduce** — smallest command (one test, one script). If you cannot reproduce, say what you need from the user (OS, env, seed).
3. **Hypotheses** — list 2–3 likely causes ranked; use logs/diffs to confirm or rule out.
4. **Minimal fix** — smallest diff that addresses the confirmed cause; avoid drive-by refactors.
5. **Verify** — re-run the same command(s) **`/code-review`** would use (`build`, `lint`, targeted tests).

## Handoff

- If fix is ready: suggest **`/code-review`** again.
- If product decision needed: stop and ask the user before coding.

## Coordination

- Does **not** replace **`/orchestrate`** for merge/archive/OpenSpec — only narrows technical failure.
