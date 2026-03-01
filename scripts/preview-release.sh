#!/usr/bin/env bash
# Preview what the next release notes will look like, without deploying.

LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v1.0.0")
VERSION=${LATEST_TAG#v}
IFS='.' read -ra V <<< "$VERSION"
NEXT="v${V[0]}.${V[1]}.$((${V[2]:-0} + 1))"

if git rev-parse "$LATEST_TAG" >/dev/null 2>&1; then
  LOG=$(git log ${LATEST_TAG}..HEAD --pretty=format:"- %s (%h)" --no-merges)
else
  LOG=$(git log --pretty=format:"- %s (%h)" --no-merges | head -20)
fi

[ -z "$LOG" ] && LOG="- No notable changes"

echo "┌─────────────────────────────────────────┐"
echo "│  Release preview: $NEXT"
echo "│  Previous tag:    $LATEST_TAG"
echo "└─────────────────────────────────────────┘"
echo ""
echo "## What's changed"
echo ""
echo "$LOG"
echo ""
echo "---"
echo "Full diff: $LATEST_TAG...$NEXT"
