#!/bin/bash
set -euo pipefail

PROJECT="simplelikes"
REPO="brendaw/simplelikes"
CHANGELOG="CHANGELOG.md"

suggest_bump() {
	local from="$1" to="${2:-HEAD}"
	if git log "${from}..${to}" --pretty=format:"%s%n%b" | grep -qE "^[a-z]+(\([^)]*\))?!:|^BREAKING[- ]CHANGE"; then
		echo "major"; return
	fi
	if git log "${from}..${to}" --pretty=format:"%s" | grep -qE "^feat(\([^)]*\))?:"; then
		echo "minor"; return
	fi
	echo "patch"
}

next_version() {
	local current="$1" bump="$2"
	local major minor patch
	IFS='.' read -r major minor patch <<< "$current"
	patch="${patch:-0}"
	case "$bump" in
		major) echo "$((major + 1)).0.0" ;;
		minor) echo "${major}.$((minor + 1)).0" ;;
		patch) echo "${major}.${minor}.$((patch + 1))" ;;
	esac
}

# --- Checks ---

if [[ -n "$(git status --porcelain)" ]]; then
	echo "release: uncommitted changes detected. Commit or stash them before releasing."
	exit 1
fi

LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
CURRENT_VERSION="${LATEST_TAG#v}"

if [[ -z "$LATEST_TAG" ]]; then
	echo "release: no tags found."
	echo "  Use: ./scripts/release.sh v0.1.0"
	exit 1
fi

if [[ $# -eq 1 ]]; then
	TAG="$1"
	[[ "$TAG" != v* ]] && TAG="v$TAG"
	VERSION="${TAG#v}"
	BUMP="manual"
else
	if ! git log "$LATEST_TAG..HEAD" --pretty=format:"%s" \
		| grep -vE '^chore: release v' \
		| grep -qE '^(feat|fix|docs|chore|ci|refactor|style|build|perf|test)[:(]'; then
		echo "release: no releasable commits since $LATEST_TAG. Nothing to release."
		exit 0
	fi
	BUMP=$(suggest_bump "$LATEST_TAG" "HEAD")
	VERSION=$(next_version "$CURRENT_VERSION" "$BUMP")
	TAG="v$VERSION"
fi

if git tag -l | grep -q "^${TAG}$"; then
	echo "release: tag $TAG already exists locally."
	exit 1
fi

if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
	echo "Error: version must be semver (e.g. v0.1.0 or 0.1.0)"
	exit 1
fi

if [[ "$BUMP" == "manual" ]]; then
	echo "release: preparing $TAG (manual override, from $LATEST_TAG)"
else
	echo "release: preparing $TAG ($BUMP bump from $LATEST_TAG)"
fi
echo ""

read -r -p "Create tag and proceed? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

echo ""
echo "→ Creating tag $TAG..."
git tag "$TAG"

echo "→ Generating CHANGELOG entry..."
RELEASING=1 ./scripts/changelog.sh

echo ""
echo "Diff summary:"
git diff --stat "$LATEST_TAG..HEAD"

echo ""
read -r -p "Commit and push? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
	echo ""
	echo "Aborted. To undo:"
	echo "  git tag -d $TAG"
	exit 0
fi

# --- Issue closing ---
CLOSE_ISSUES=()
echo ""
read -r -p "Does this release close any open issues? [y/N] " close_confirm
if [[ "$close_confirm" =~ ^[Yy]$ ]]; then
	echo ""
	echo "Open issues:"
	gh issue list --repo "$REPO" --state open --json number,title \
		--jq '.[] | "  #\(.number)   \(.title)"'
	echo ""
	read -r -p "Issue numbers to close (space-separated, Enter to skip): " issue_input
	for num in $issue_input; do
		[[ "$num" =~ ^[0-9]+$ ]] && CLOSE_ISSUES+=("$num")
	done
fi

# --- Commit ---
echo ""
echo "→ Committing..."
git add "$CHANGELOG"
if (( ${#CLOSE_ISSUES[@]} > 0 )); then
	closes_body=""
	for num in "${CLOSE_ISSUES[@]}"; do
		closes_body="${closes_body}Closes #${num}"$'\n'
	done
	git commit -m "chore: release $TAG" -m "$closes_body"
else
	git commit -m "chore: release $TAG"
fi

echo "→ Moving tag $TAG to release commit..."
git tag -f "$TAG"

echo "→ Pushing main..."
git push origin main

echo "→ Pushing tag $TAG..."
git push origin "$TAG"

if ! git ls-remote origin "refs/tags/$TAG" | grep -q .; then
	echo ""
	echo "✗ Tag $TAG was not pushed to remote."
	echo "  Push it manually:"
	echo "    git push origin $TAG"
	exit 1
fi

echo ""
echo "✓ Release $TAG pushed."
echo "  GitHub Actions release and deploy triggered automatically."
echo "  Track at: https://github.com/$REPO/actions"

if (( ${#CLOSE_ISSUES[@]} > 0 )); then
	echo ""
	echo "→ Closing issues..."
	for num in "${CLOSE_ISSUES[@]}"; do
		gh issue close "$num" --repo "$REPO"
		echo "  #$num closed"
	done
fi
