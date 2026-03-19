---
name: feature-workflow
description: Git worktree workflow for new SatTrack features. Use when the user wants to implement a new feature, add functionality, or start feature work. Ensures worktree isolation and merge only after approval.
---

# Feature Workflow

When the user requests a new feature implementation, follow this workflow. Do not merge to `development` until the user explicitly approves.

## Checklist

1. [ ] Verify current branch is `development` (or switch to it)
2. [ ] Create worktree for the feature
3. [ ] Implement in the worktree
4. [ ] Test (`npm run build`, manual checks)
5. [ ] Stop and wait for user approval
6. [ ] Merge to development + push (only after approval)
7. [ ] Remove worktree, delete branch, switch Cursor back to development

## Steps

### 1. Verify branch

```bash
cd /Users/goran/Projects/radio/satTrack/development
git branch --show-current
# Must be development
```

### 2. Create worktree

```bash
cd /Users/goran/Projects/radio/satTrack/satTrack.git
git worktree add ../feature-<name> -b feature/<name>
```

Use a descriptive name (e.g. `feature-settings-export`, branch `feature/settings-export`).

### 2b. Switch Cursor to feature worktree

Run this so editor and terminal stay in sync (avoids editor on development, terminal on feature):

```bash
cursor -r /Users/goran/Projects/radio/satTrack/feature-<name>
```

`-r` reuses the current window — workspace switches to the feature folder. User may need to approve if Cursor prompts.

### 3. Work in the worktree

Implement the feature in the now-active workspace. Run `npm run build` before declaring done.

### 4. Wait for approval

**Do not merge.** Tell the user: feature is ready, list changes, ask for approval to merge to development.

### 5. Merge (only when user approves)

```bash
cd /Users/goran/Projects/radio/satTrack/development
git merge feature/<name> && git push origin development
cd /Users/goran/Projects/radio/satTrack/satTrack.git
git worktree remove ../feature-<name>
git branch -d feature/<name>
```

### 5b. Switch Cursor back to development

```bash
cursor -r /Users/goran/Projects/radio/satTrack/development
```

## Prerequisite

`cursor` CLI: Command Palette → "Shell Command: Install 'cursor' command". Required for steps 2b and 5b.

## References

- `.cursor/rules/git-workflow.mdc` — full workflow
- README "New Feature Workflow" section
