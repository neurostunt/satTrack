#!/usr/bin/env bash
set -e

COMMAND="${1:-help}"

usage() {
  echo "Usage:"
  echo "  ./scripts/deploy.sh release          Interactive production release (patch/minor/major or hotfix)"
  echo "  ./scripts/deploy.sh beta [branch]    Trigger Vercel preview deploy (no tag, no merge)"
  echo ""
  echo "Examples:"
  echo "  ./scripts/deploy.sh release"
  echo "  ./scripts/deploy.sh beta"
  echo "  ./scripts/deploy.sh beta feature/my-feat"
}

latest_release_tag() {
  git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || echo "v1.0.0"
}

bump_version() {
  local TAG="$1" BUMP="$2"
  local VERSION="${TAG#v}"
  IFS='.' read -ra P <<< "$VERSION"
  case "$BUMP" in
    patch) echo "v${P[0]}.${P[1]}.$((P[2] + 1))" ;;
    minor) echo "v${P[0]}.$((P[1] + 1)).0" ;;
    major) echo "v$((P[0] + 1)).0.0" ;;
  esac
}

LAST_RUN_ID=""

watch_run() {
  local WORKFLOW="$1"
  echo ""
  echo "⏳ Waiting for workflow run to start..."
  sleep 4
  LAST_RUN_ID=$(gh run list --workflow="$WORKFLOW" --limit=1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")
  if [ -n "$LAST_RUN_ID" ]; then
    echo "→ Watching run #$LAST_RUN_ID (Ctrl+C to detach, workflow continues)"
    echo ""
    gh run watch "$LAST_RUN_ID" --exit-status || true
  else
    echo "⚠️  Could not find run. Check: $(gh repo view --json url -q .url)/actions"
  fi
}

push_tag() {
  local TAG="$1"
  local BRANCH
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"

  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "ERROR: Tag $TAG already exists."
    exit 1
  fi

  git tag -a "$TAG" -m "release $TAG"
  git push origin "$BRANCH"
  git push origin "$TAG"

  echo ""
  echo "✓ Tag $TAG pushed from $BRANCH."
  watch_run "production-release.yml"

  echo ""
  echo "🌍 Production: https://neurostunt.rs"
}

case "$COMMAND" in
  release)
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "ERROR: Uncommitted changes. Commit or stash first."
      exit 1
    fi

    LATEST=$(latest_release_tag)

    echo ""
    echo "Current version: $LATEST"
    echo ""
    echo "Release type:"
    echo "  1) Production release"
    echo "  2) Hotfix"
    echo ""
    read -rp "Choose [1/2]: " RELEASE_TYPE

    case "$RELEASE_TYPE" in
      1)
        echo ""
        echo "Version bump:"
        echo "  1) Patch  — bug fixes            $(bump_version "$LATEST" patch)"
        echo "  2) Minor  — new features          $(bump_version "$LATEST" minor)"
        echo "  3) Major  — breaking changes      $(bump_version "$LATEST" major)"
        echo ""
        read -rp "Choose [1/2/3]: " BUMP

        case "$BUMP" in
          1) NEW_TAG=$(bump_version "$LATEST" patch) ;;
          2) NEW_TAG=$(bump_version "$LATEST" minor) ;;
          3) NEW_TAG=$(bump_version "$LATEST" major) ;;
          *) echo "Invalid choice."; exit 1 ;;
        esac
        ;;

      2)
        HOTFIX_NUM=$(git tag | grep -E "^${LATEST}-hotfix\.[0-9]+$" | wc -l | tr -d ' ')
        NEW_TAG="${LATEST}-hotfix.$((HOTFIX_NUM + 1))"
        ;;

      *) echo "Invalid choice."; exit 1 ;;
    esac

    echo ""
    echo "Tag to create: $NEW_TAG"
    read -rp "Confirm? [y/N]: " CONFIRM
    [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && echo "Aborted." && exit 0

    push_tag "$NEW_TAG"
    ;;

  beta)
    BRANCH="${2:-development}"

    if ! command -v gh &>/dev/null; then
      echo "ERROR: GitHub CLI (gh) is required. Install: https://cli.github.com"
      exit 1
    fi

    echo "→ Triggering beta deploy for branch: $BRANCH..."
    gh workflow run beta-deploy.yml --ref "$BRANCH" -f branch="$BRANCH"
    echo "✓ Beta deploy triggered."
    watch_run "beta-deploy.yml"

    ;;

  help|--help|-h)
    usage
    ;;

  *)
    echo "Unknown command: $COMMAND"
    usage
    exit 1
    ;;
esac
