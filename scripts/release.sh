#!/bin/bash
set -euo pipefail

# Simple release script for simplelikes
# Usage: ./scripts/release.sh [v0.1.0]

PROJECT="simplelikes"

if [ $# -eq 1 ]; then
	TAG="$1"
else
	# Suggest next version from git tags
	LATEST=$(git tag --sort=-v:refname | head -n1 | sed 's/^v//' || echo "0.0.0")
	IFS='.' read -r MAJOR MINOR PATCH <<< "$LATEST"
	SUGGESTED="v$MAJOR.$MINOR.$((PATCH + 1))"
	echo ""
	echo "Latest tag: v$LATEST"
	echo "Suggested:  $SUGGESTED"
	echo ""
	read -r -p "Version tag [$SUGGESTED]: " TAG
	TAG=${TAG:-$SUGGESTED}
fi

# Strip leading v if present for validation
VERSION="${TAG#v}"
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
	echo "Error: version must be semver (e.g. v0.1.0 or 0.1.0)"
	exit 1
fi

echo ""
echo "Releasing $PROJECT $TAG"
echo ""
read -r -p "Create tag $TAG? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
	echo "Aborted."
	exit 1
fi

git tag -a "$TAG" -m "Release $TAG"
git push origin main
git push origin "$TAG"

echo ""
echo "✓ Release $TAG pushed — GitHub Actions will build and publish."
