#!/usr/bin/env bash
set -e

if ! command -v vercel &>/dev/null; then
  echo "ERROR: Vercel CLI not found. Run: npm install -g vercel"
  exit 1
fi

PROJECT_DIR="$(git rev-parse --show-toplevel)"
cd "$PROJECT_DIR"

echo ""
echo "Fetching recent production deployments..."
echo ""

# List last 10 production deployments with index
DEPLOYMENTS=$(vercel ls --environment=production 2>/dev/null | grep -E 'https://' | head -10)

if [ -z "$DEPLOYMENTS" ]; then
  echo "ERROR: No production deployments found."
  exit 1
fi

# Display numbered list
INDEX=1
while IFS= read -r LINE; do
  printf "  %2d)  %s\n" "$INDEX" "$LINE"
  INDEX=$((INDEX + 1))
done <<< "$DEPLOYMENTS"

echo ""
echo "  [0]  Cancel"
echo ""
read -rp "Roll back to deployment #: " CHOICE

[[ "$CHOICE" == "0" || -z "$CHOICE" ]] && echo "Aborted." && exit 0

# Extract the selected line
SELECTED=$(echo "$DEPLOYMENTS" | sed -n "${CHOICE}p")

if [ -z "$SELECTED" ]; then
  echo "ERROR: Invalid selection."
  exit 1
fi

# Extract deployment URL (https://...)
URL=$(echo "$SELECTED" | grep -oE 'https://[^ ]+')

if [ -z "$URL" ]; then
  echo "ERROR: Could not extract deployment URL."
  exit 1
fi

echo ""
echo "Rolling back to: $URL"
read -rp "Confirm rollback to production? [y/N]: " CONFIRM
[[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && echo "Aborted." && exit 0

echo ""
echo "→ Executing rollback..."
vercel rollback "$URL" --yes

echo ""
echo "✓ Rollback complete. Production is now serving: $URL"
