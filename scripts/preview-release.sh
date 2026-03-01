#!/usr/bin/env bash
# Preview what the next release notes will look like, without deploying.

# Latest stable tag only (ignore hotfix tags)
LATEST_TAG=$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 2>/dev/null || echo "v1.0.0")
VERSION="${LATEST_TAG#v}"
IFS='.' read -ra V <<< "$VERSION"
NEXT="v${V[0]}.${V[1]}.$((V[2] + 1))"

# Latest hotfix on this version (if any)
HOTFIX=$(git tag --sort=-version:refname | grep -E "^${LATEST_TAG}-hotfix\." | head -1 || true)

if git rev-parse "$LATEST_TAG" >/dev/null 2>&1; then
  LOG=$(git log "${LATEST_TAG}..HEAD" --pretty=format:"- %s (%h)" --no-merges)
else
  LOG=$(git log --pretty=format:"- %s (%h)" --no-merges | head -20)
fi

[ -z "$LOG" ] && LOG="- No notable changes"

COMMIT_COUNT=$(echo "$LOG" | grep -c '^-' || true)

echo "┌─────────────────────────────────────────┐"
printf  "│  Release preview:  %-21s│\n" "$NEXT"
printf  "│  Previous release: %-21s│\n" "$LATEST_TAG"
[ -n "$HOTFIX" ] && printf "│  Latest hotfix:    %-21s│\n" "$HOTFIX"
printf  "│  Commits since:    %-21s│\n" "$COMMIT_COUNT commits"
echo "└─────────────────────────────────────────┘"
echo ""
echo "## What's changed"
echo ""
echo "$LOG"
echo ""
echo "---"
echo "Full diff: ${LATEST_TAG}...${NEXT}"
