#!/usr/bin/env bash
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
MAIN_WORKTREE="/Users/goran/Projects/radio/satTrack/main"

# Must be on development
if [ "$CURRENT_BRANCH" != "development" ]; then
  echo "ERROR: Must be on 'development' branch (currently on '$CURRENT_BRANCH')"
  echo "       Merge your feature branch first, then run deploy."
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: Uncommitted changes detected. Commit or stash them first."
  exit 1
fi

# Push development
echo "→ Pushing development..."
git push origin development

# Merge development → main
echo "→ Merging development into main..."
cd "$MAIN_WORKTREE"
git fetch origin
git checkout main
git merge origin/development --no-ff -m "chore: deploy from development"
git push origin main

echo "✓ Deployed — GitHub Actions will tag + Vercel will deploy."
